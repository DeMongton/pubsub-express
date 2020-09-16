# pubsub-express

pub-sub express is a lite implementation of the publisher/subscriber model written in Express.

## Prerequisite

Make sure you have the lastest version of the following software installed:

1. [NodeJS](https://nodejs.org/en/)
2. [npm](https://www.npmjs.com/)

## Installation

1. Clone the repository
2. run `npm install` 
3. run `npm start`

## Usage

Once you have run `npm start` the server will be listening by default on port 8000.

You can now do the following requests:

**Setting up a subscription**

URL: http://localhost:8000/subscribe/{TOPIC} 
BODY: { url: "http://localhost:8000/event"}

e.g. 

`$ curl -X POST -d '{ "url": "http://localhost:8001/event"}' http://localhost:8000/subscribe/topic1`

The above curl command  would create a subscription for all events of {TOPIC} and forward data to http://localhost:8000/event upon a message being published (see next section).

**Publish to a subscription**

URL: http://localhost:8000/publish/{TOPIC}
BODY: { "message": "hello"}

To publish to a subscription simply provide a message to the message property in your JSON body. 

e.g.

`$ curl -X POST -H "Content-Type: application/json" -d '{"message": "hello"}' http://localhost:8000/publish/topic1`


The above curl command publishes to all of the stored urls under the particular {TOPIC}.

**Note:** When passing a URL make sure you include the complete URL, this means "http" or "https" should be included.

## Additional details

If for some reason a url being published to is not available, the application will automatically queue it for another try within the next 5s. The application will stop trying after 5 tries.
