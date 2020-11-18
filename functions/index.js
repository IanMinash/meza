const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {
  Asset,
  Server,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
  BASE_FEE,
} = require("stellar-sdk");
const Mpesa = require("mpesa-node");
const project = process.env.GCLOUD_PROJECT;

admin.initializeApp();

const server = new Server("https://horizon-testnet.stellar.org");
const mezaSecret = functions.config().meza.secret;
const mezaKeypair = Keypair.fromSecret(mezaSecret);

const mpesaApi = new Mpesa({
  consumerKey: functions.config().mpesa.key, // key
  consumerSecret: functions.config().mpesa.secret, // secret
  initiatorName: "Meza",
  shortCode: "601408",
  lipaNaMpesaShortCode: functions.config().mpesa.shortcode, // shortcode
  lipaNaMpesaShortPass: functions.config().mpesa.shortpass, // shortpass
  securityCredential: functions.config().mpesa.credential, // credential
});

const KESM = new Asset("KESM", mezaKeypair.publicKey());

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
        Operation.changeTrust({
          asset: KESM,
          source: userKeypair.publicKey(),
        })
      )
      .addOperation(
        Operation.endSponsoringFutureReserves({
          source: userKeypair.publicKey(),
        })
      )
      // Allow trust so that user can hold our asset
      .addOperation(
        Operation.allowTrust({
          trustor: userKeypair.publicKey(),
          assetCode: "KESM",
          authorize: 1,
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

    transaction.addOperation(
      Operation.changeTrust({
        asset: KESM,
        source: groupKeypair.publicKey(),
      })
    );

    transaction
      .addOperation(
        Operation.endSponsoringFutureReserves({
          source: groupKeypair.publicKey(),
        })
      )
      .addOperation(
        Operation.allowTrust({
          trustor: groupKeypair.publicKey(),
          assetCode: "KESM",
          authorize: 1,
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
    let groupKeypair = Keypair.fromSecret(snap.after.signKey);

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
 * HTTP function used to initiate a payment request from a user.
 *
 * Requires the following in body:
 * @param {string}  userId uid of the user depositing the funds
 * @param {string}  phoneNumber  phoneNumber that the payment request will be sent to
 * @param {number}  amount Amount to be charged from the number
 * @param {string}  chamaWallet  The chama to which the user is depositing the funds
 * @param {string}  reason reason for contribution, could be contribution, loan payment...
 */
exports.sendMPesaSTKPushDeposits = functions
  .region("europe-west3")
  .https.onRequest(async (req, res) => {
    console.log(req.body);

    res.set("Access-Control-Allow-Origin", "*");

    if (req.method === "OPTIONS") {
      // Send response to OPTIONS requests
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Max-Age", "3600");
      res.status(204).send("");
    }

    if (req.method === "POST") {
      const { userId, phoneNumber, amount, chamaWallet, reason } = req.body;

      try {
        let { data } = await mpesaApi.lipaNaMpesaOnline(
          phoneNumber,
          amount,
          `https://europe-west3-${project}.cloudfunctions.net/mpesaSTKCallbackDeposits`,
          "MEZA" // N/A for till numbers
        );

        let { CheckoutRequestID, ResponseCode, ResponseDescription } = data;

        if (Number(ResponseCode) === 0) {
          await admin.firestore().doc(`deposits/${CheckoutRequestID}`).set({
            userId,
            chamaWallet,
            amount,
            status: "pending",
            reason,
            timestamp: Date.now(),
          });

          console.log(
            `MpesaSTKPushDeposit transaction ${CheckoutRequestID} initiated for user ${userId}`
          );

          res.status(202).send({ transactionId: CheckoutRequestID });
        } else {
          res.status(400).send({ ResponseCode, ResponseDescription });
        }
      } catch (error) {
        // lipaNaMpesaOnline or firestore op failed
        if (error.response) {
          let { ResponseCode, ResponseDescription } = error.response.data;
          console.error(error.response.data);
          res.status(400).send({ ResponseCode, ResponseDescription });
        } else if (error.request) {
          console.error(error.request);
        } else {
          console.error(error.message);
          res.sendStatus(500);
        }
      }
    }
  });

/**
 * HTTP function called by the payment processor after the payment has been resolved, whether failed or successful.
 */
exports.mpesaSTKCallbackDeposits = functions
  .region("europe-west3")
  .https.onRequest(async (req, res) => {
    const { Body } = req.body;
    const { CheckoutRequestID, ResultCode, ResultDesc } = Body.stkCallback;
    let updateData;

    if (Number(ResultCode) === 0) {
      // Transaction successful
      let deposit = await admin
        .firestore()
        .doc(`deposits/${CheckoutRequestID}`);
      let { userId, chamaWallet, reason } = await (await deposit.get()).data();

      let user = await (
        await admin.firestore().doc(`users/${userId}`).get()
      ).data();
      let userKeypair = Keypair.fromSecret(user.signKey);

      /**
       * Item has the structure:
       *
       *    [
       *     {Name: "MpesaReceiptNumber", Value:"MRLSJHDH9" },
       *     {Name: "Amount", Value: 10 },
       *     ...
       *    ]
       */
      const Item = Body.stkCallback.CallbackMetadata.Item;

      let transactionData = {};
      // Extract data from Item & put it in transactionData
      Item.forEach((item) => {
        transactionData[item.Name] = item.Value;
      });

      const { PhoneNumber, Amount, MpesaReceiptNumber } = transactionData;
      updateData = {
        status: "success",
        phone: PhoneNumber,
        amount: Amount,
        MpesaReceiptNumber,
      };

      // Deposit successful, send asset to user's wallet
      let mezaAcc = await server.loadAccount(mezaKeypair.publicKey());

      // Assumes trustline to Meza account was already created during user registration
      const transaction = new TransactionBuilder(mezaAcc, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.beginSponsoringFutureReserves({
            sponsoredId: userKeypair.publicKey(),
          })
        )
        // Issue deposited funds to user's wallet
        .addOperation(
          Operation.payment({
            destination: userKeypair.publicKey(),
            amount: `${Amount}`,
            asset: KESM,
          })
        )
        // Send issued funds to chama's wallet from user's wallet
        .addOperation(
          Operation.payment({
            destination: chamaWallet,
            amount: `${Amount}`,
            asset: KESM,
            source: userKeypair.publicKey(),
          })
        )
        .addOperation(
          Operation.endSponsoringFutureReserves({
            source: userKeypair.publicKey(),
          })
        )
        .addMemo(Memo.text(reason))
        .setTimeout(0)
        .build();

      transaction.sign(mezaKeypair, userKeypair);

      try {
        await server.submitTransaction(transaction);
        console.log(
          `Group ${chamaWallet} credited with KES ${Number(Amount)
            .toFixed(2)
            .toLocaleString()} by ${userKeypair.publicKey()}`
        );
      } catch (error) {
        updateData.status = "failed";
        updateData.failPoint = "stellar";
        console.error(
          `An error occured while processing deposit [${CheckoutRequestID}]`
        );
      }
    } else {
      updateData = {
        status: "failed",
        failPoint: "mpesa",
        message: `${ResultCode}: ${ResultDesc}`,
      };
    }

    try {
      await admin
        .firestore()
        .doc(`deposits/${CheckoutRequestID}`)
        .update(updateData);
      res.sendStatus(200);
    } catch (error) {
      // Firestore op failed
      console.error(error);
      res.sendStatus(500);
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
