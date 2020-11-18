import { Server } from "stellar-sdk";

const server = new Server("https://horizon-testnet.stellar.org");

export const operationString = (operation, targetAccount = null) => {
  switch (operation.type) {
    case "createAccount":
      if (targetAccount) {
        if (targetAccount === operation.destination) {
          return "Account created";
        }
      }
      break;

    case "payment":
      if (targetAccount === operation.from) {
        return `Sent ${operation.asset_code} ${operation.amount} to ${operation.to}`;
      } else if (targetAccount === operation.to) {
        return `Received ${operation.asset_code} ${Number(
          operation.amount
        ).toLocaleString()} from ${operation.from}`;
      }
      break;

    default:
      return null;
  }
};

export const paymentString = (paymentRecord, targetAccount) => {
  switch (paymentRecord.type) {
    case "payment":
      if (
        paymentRecord.asset_issuer ===
        "GCMEZA2M6LTEGDJ5TFHGZ44VQUKT4KGMVTDVP5645X3LBCMHHE4EQBFU"
      ) {
        if (paymentRecord.from === targetAccount) {
          return `${Number(paymentRecord.amount).toLocaleString()} sent to ${
            paymentRecord.to
          }`;
        } else if (paymentRecord.to === targetAccount) {
          return `Received KES ${Number(
            paymentRecord.amount
          ).toLocaleString()} from ${paymentRecord.from}`;
        }
      }
      break;

    case "create_account":
      return "Account created";

    default:
      break;
  }
};

export default server;
