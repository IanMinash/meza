const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {
  Server,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  BASE_FEE,
} = require("stellar-sdk");

admin.initializeApp();

const server = new Server("https://horizon-testnet.stellar.org");
const mezaSecret = functions.config().meza.secret;
const mezaKeypair = Keypair.fromSecret(mezaSecret);

// 1.
exports.createUserWallet = functions
  .region("europe-west3")
  .auth.user()
  .onCreate(async (user, context) => {
    // Create a random kp for this account
    let userKeypair = Keypair.random();

    let mezaAcc = await server.loadAccount(mezaKeypair.publicKey());

    // Sponsor createAccount operation to cover minimum fee requirements for user's wallet
    const transaction = new TransactionBuilder(mezaAcc, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.beginSponsoringFutureReserves({
          sponsoredId: userKeypair.publicKey(),
        })
      )
      .addOperation(
        Operation.createAccount({
          destination: userKeypair.publicKey(),
          startingBalance: "0",
        })
      )
      .addOperation(
        Operation.endSponsoringFutureReserves({
          source: userKeypair.publicKey(),
        })
      )
      .setTimeout(0)
      .build();

    transaction.sign(mezaKeypair, userKeypair);

    try {
      await server.submitTransaction(transaction);
      console.log(`User ${user.uid}'s wallet created successfully!`);
    } catch (error) {
      console.error(`An error occured while creating wallet for ${user.uid}`);
    }

    await admin.firestore().doc(`users/${user.uid}`).set({
      signKey: userKeypair.secret(),
      pubKey: userKeypair.publicKey(),
    });
  });

// 2
exports.createSavingsGroupWallet = functions
  .region("europe-west3")
  .firestore.document("groups/{groupId}")
  .onCreate(async (snap, context) => {
    // Get creator of this group
    let user = await admin.firestore().doc(`users/${snap.data().members[0]}`);

    // Add group to user document for easy lookup
    await user.update({
      groups: admin.firestore.FieldValue.arrayUnion(snap.id),
    });

    // Create a random kp for this account
    let groupKeypair = Keypair.random();

    let mezaAcc = await server.loadAccount(mezaKeypair.publicKey());

    let transaction = new TransactionBuilder(mezaAcc, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.beginSponsoringFutureReserves({
          sponsoredId: groupKeypair.publicKey(),
        })
      )
      .addOperation(
        Operation.createAccount({
          destination: groupKeypair.publicKey(),
          startingBalance: "0",
        })
      );

    let creatorPubKey = await (await user.get()).data().pubKey;
    console.log(`Got creator's public key ${creatorPubKey}`);

    // Add creator's signatures to group's wallet
    transaction.addOperation(
      Operation.setOptions({
        source: groupKeypair.publicKey(),
        masterWeight: 0,
        lowThreshold: 1,
        medThreshold: 1,
        highThreshold: 1,
        signer: {
          ed25519PublicKey: creatorPubKey,
          weight: 1,
        },
      })
    );

    transaction
      .addOperation(
        Operation.endSponsoringFutureReserves({
          source: groupKeypair.publicKey(),
        })
      )
      .setTimeout(0);

    transaction = transaction.build();
    transaction.sign(mezaKeypair, groupKeypair);

    try {
      await server.submitTransaction(transaction);
      console.log(`Savings Group ${snap.id}'s wallet created successfully!`);
    } catch (error) {
      console.error(
        `An error occured while creating wallet for savings group ${snap.id}`
      );
      console.error(error);
    }

    await admin.firestore().doc(`groups/${snap.id}`).set(
      {
        signKey: groupKeypair.secret(),
        pubKey: groupKeypair.publicKey(),
      },
      { merge: true }
    );
  });

// 3
exports.updateSavingsGroup = functions
  .region("europe-west3")
  .firestore.document("groups/{groupId}")
  .onUpdate(async (snap, context) => {
    let users = await getAllDocs("users", {
      attribute: "group",
      comparator: "array-contains",
      value: snap.after.id,
    });

    // Get group's keypair
    let groupKeypair = Keypair.fromSecret(snap.after.signKey());

    let mezaAcc = await server.loadAccount(mezaKeypair.publicKey());

    let transaction = new TransactionBuilder(mezaAcc, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    }).addOperation(
      Operation.beginSponsoringFutureReserves({
        sponsoredId: groupKeypair.publicKey(),
      })
    );

    let memberDiff =
      snap.after.data().members.length - snap.before.data().members.length;
    if (memberDiff > 0) {
      // Member added
      let newMembers = setDifference(
        new Set(snap.after.data().members),
        new Set(snap.before.data().members)
      );

      // Add new members' signature to group's wallet
      newMembers.forEach(async (member) => {
        let userPubKey = await (
          await admin.firestore().doc(`users/${member}`).get()
        ).data().pubKey;

        transaction.addOperation(
          Operation.setOptions({
            source: groupKeypair.publicKey(),
            signer: {
              ed25519PublicKey: userPubKey,
              weight: 1,
            },
          })
        );
      });

      // Update medium and high thresholds to be 2/3 of all members
      transaction.addOperation(
        Operation.setOptions({
          source: groupKeypair.publicKey(),
          medThreshold: Math.round(
            ((users.length + newMembers.length) * 2) / 3
          ),
          highThreshold: Math.round(
            ((users.length + newMembers.length) * 2) / 3
          ),
        })
      );
    } else if (memberDiff < 0) {
      // Member removed
      let membersLeft = setDifference(
        new Set(snap.before.data().members),
        new Set(snap.after.data().members)
      );

      // Remove members who've left signatures from the group's wallet
      membersLeft.forEach(async (member) => {
        let userPubKey = await (
          await admin.firestore().doc(`users/${member}`).get()
        ).data().pubKey;

        transaction.addOperation(
          Operation.setOptions({
            source: groupKeypair.publicKey(),
            signer: {
              ed25519PublicKey: userPubKey,
              weight: 0,
            },
          })
        );
      });

      // Update medium and high thresholds to be 2/3 of remaining members
      transaction.addOperation(
        Operation.setOptions({
          source: groupKeypair.publicKey(),
          medThreshold: Math.round(
            ((users.length - membersLeft.length) * 2) / 3
          ),
          highThreshold: Math.round(
            ((users.length - membersLeft.length) * 2) / 3
          ),
        })
      );
    }

    transaction
      .addOperation(
        Operation.endSponsoringFutureReserves({
          source: groupKeypair.publicKey(),
        })
      )
      .setTimeout(0);

    transaction = transaction.build();
    transaction.sign(
      mezaKeypair,
      ...users.map((user) => Keypair.fromSecret(user.signKey))
    );

    try {
      await server.submitTransaction(transaction);
      console.log(`Savings Group ${snap.id}'s wallet updated successfully!`);
    } catch (error) {
      console.error(
        `An error occured while updating wallet for savings group ${snap.id}`
      );
    }
  });

/**
 * Returns data of all documents in the given collection. If a condition object is given the documents will be filtered.
 */
const getAllDocs = async (
  collection,
  condition = { attribute: null, comparator: null, value: null }
) => {
  let docs = [];
  let snapshot;
  condition.attribute
    ? (snapshot = await admin
        .firestore()
        .collection(collection)
        .where(condition.attribute, condition.comparator, condition.value)
        .get())
    : (snapshot = await this.firestore.collection(collection).get());
  snapshot.forEach((doc) => {
    let docData = doc.data();
    docData.id = doc.id;
    docs.push(docData);
  });
  return docs;
};

/**
 * Returns the difference between 2 sets
 */
const setDifference = (setA, setB) => {
  let _difference = new Set(setA);
  for (let elem of setB) {
    _difference.delete(elem);
  }
  return _difference;
};
