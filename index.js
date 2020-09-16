const express = require("express");
const fetch = require("node-fetch");
const app = express();
const port = 8000;
let subscriptions = {};

async function postToURL(url, topic, message, count) {
  try {
    const body = { topic: topic, message: message };
    const response = await fetch(url, {
      method: "post",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    return response.status;
  } catch (error) {
    console.error(error.message);
    count++;
    /* If POSTing to an endpoint fails we are going to recursively call this function back using,
     * the setTimeout until 5 tries have been exhausted. */
    if (count && count < 5) {
      setTimeout(async function () {
        const responseCode = await postToURL(url, topic, message, count);
        if (responseCode != 200 && count != 4) {
          console.error(`Failed to publish at: ${url}, will try again in 5s.`);
        } else {
          console.error(`Failed to publish at: ${url}, no more attempts.`);
        }
      }, 5000);
    }
  }
}

async function publish(arr, topic, message) {
  for (i = 0; i < arr.length; i++) {
    const url = arr[i];
    const responseCode = await postToURL(url, topic, message, 0);
    if (responseCode != 200) {
      console.error(`Failed to publish at: ${url}, will try again in 5s.`);
    }
  }
}

function apiErrorHandler(err, req, res, next) {
  // if there's no statusCode associated to the error, return 500
  const statusCode = err.statusCode || 500;
  res
    .status(statusCode)
    .send(
      `{"message": ${
        err.message || "Internal Server Error."
      }, "statusCode": ${statusCode}}`
    );
}

app.use(express.json({ type: "*/*" }));
app.use(express.urlencoded({ extended: true }));

app.post("/subscribe/*", async (req, res, next) => {
  const topic = req.params[0];
  //console.log(data)
  //console.log(topic)

  // The "if" statements below validate the parameters provided, if any of them fail we need to throw an error.

  // Validate that a topic has been provided
  if (topic == "") {
    let error = new Error(`"Missing 'topic' parameter."`);
    //return next(new Error('Invalid API Endpoint'))
    error.statusCode = 400;
    return next(error);
  }

  // Verify that a value for URL has been provided
  if (!req.body.url) {
    let error = new Error(`"Missing 'url' parameter."`);
    //return next(new Error('Invalid API Endpoint'))
    error.statusCode = 400;
    return next(error);
  }

  // Verify that the provided value for URL is valid, note: needs to include http or https.
  const regexURL = new RegExp(
    "(https?://(?:www.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|www.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|https?://(?:www.|(?!www))[a-zA-Z0-9]+.[^s]{2,}|www.[a-zA-Z0-9]+.[^s]{2,})"
  );
  if (!regexURL.test(req.body.url)) {
    let error = new Error(`"Invalid 'url' parameter."`);
    error.statusCode = 400;
    return next(error);
  }

  // If the topic does not already exists, create queue
  if (!subscriptions[topic]) {
    subscriptions[topic] = [req.body.url];
  }

  // Check if topic has an existing queue, If the topic already exists, also check if the endpoint/url already exists in the queue if it doesn't, push the subscription into the queue. Otherwise it's ok to return a success message since POST requests are idempotent.
  else if (
    subscriptions[topic] &&
    subscriptions[topic].indexOf(req.body.url) === -1
  ) {
    subscriptions[topic].push(req.body.url);
  }
  console.log("Current Subscriptions:");
  console.log(subscriptions);
  res.json({
    message: `Successfully subscribed to topic: ${topic}`,
    statusCode: 200,
  });
});

app.post("/publish/*", async (req, res, next) => {
  const topic = req.params[0];

  // Validate that a topic has been provided
  if (topic == "") {
    let error = new Error(`"Missing 'topic' parameter."`);
    //return next(new Error('Invalid API Endpoint'))
    error.statusCode = 400;
    return next(error);
  }

  // Validate that a queue exists
  if (!subscriptions[topic]) {
    let error = new Error(`"topic: '${topic}' not found."`);
    //return next(new Error('Invalid API Endpoint'))
    error.statusCode = 400;
    return next(error);
  }

  // make sure the body contains a message.
  if (!req.body.message) {
    let error = new Error(`"Missing 'message' parameter."`);
    error.statusCode = 400;
    return next(error);
  }

  res.send(
    `{"statusCode": 200, "message": "Successfully published topic: ${topic}"}`
  );

  // POST to each url in the given array.
  publish(subscriptions[topic], topic, req.body.message);
  //console.log(req.body.message);
  //console.log(topic);
});

// if all routes fail:
app.use((req, res, next) => {
  const error = new Error("Resource Not Found");
  error.statusCode = 500;
  next(error);
});

app.use(apiErrorHandler);
app.listen(port, () => console.log(`now running at http://localhost:${port}`));
