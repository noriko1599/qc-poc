const { jsonEvent } = require("@eventstore/db-client");
const client = require("./client");
const { v4: uuid } = require("uuid");

async function checkSimCard(simCard) {
  return Date.now() % 2 == 0;
}

async function reducer(resolvedEvent) {
  switch (resolvedEvent?.event?.type) {
    case "qc.checkSimCards":
      checkSimCardsHandler(resolvedEvent);
      break;

    default:
      break;
  }
}

async function checkSimCardsHandler(resolvedEvent) {
  const data = {
    checkId: uuid(),
    passed: [],
    notPassed: [],
    allPassed: false,
    addToInventory: resolvedEvent.event.data.addToInventory,
  };

  resolvedEvent.event.data.simCards.forEach((simCard) => {
    const checkResult = checkSimCard(simCard);
    if (!checkResult) {
      return data.notPassed.push(simCard);
    }

    return data.passed.push(simCard);
  });

  data.allPassed = data.notPassed.length === 0;

  const event = jsonEvent({
    type: "qc.simCardsChecked",
    data,
    metadata: {
      ...resolvedEvent.event.metadata,
    },
  });

  await client.appendToStream(`qc`, [event]);
}

async function main() {
  const subscription = client.subscribeToStream("command-qc", {
    resolveLinkTos: true,
    fromRevision: END,
  });

  subscription.on("data", reducer);

  const command = jsonEvent({
    type: "qc.checkSimCards",
    data: {
      addToInventory: false,
      simCards: [
        {
          number: "0973691519",
          planType: "postpaid",
          customAttributes: [],
        },
      ],
    },
    metadata: {
      $correlationId: uuid(),
    },
  });

  await client.appendToStream(`command-qc`, [command]);
}

main().catch((error) => console.error(error));
