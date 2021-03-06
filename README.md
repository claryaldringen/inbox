# inbox

This is a work in progress IMAP client for node.js. 

The project consists of two major parts

  * IMAP command parser (token based, more or less complete)
  * IMAP control for accessing mailboxes (under construction)

[![Build Status](https://secure.travis-ci.org/andris9/inbox.png)](http://travis-ci.org/andris9/inbox)

## Installation

Install from npm

    npm install inbox

## API

**NB!** This API is preliminary and may change.

Use **inbox** module

    var inbox = require("inbox");

### Create new IMAP connection

Create connection object with 

    inbox.createConnection(port, host, options)

where

  * **port** is the port to the server (defaults to 143 on non-secure and to 993 on secure connection)
  * **host** is the hostname of the server
  * **options** is an options object for auth etc.
  * **options.secureConnection** is a Boolean value to indicate if the connection is initially secure or not
  * **options.auth** is an authentication object
  * **options.auth.user** is the IMAP username
  * **options.auth.pass** is the IMAP password
  * **options.auth.XOAuthToken** (optional) is either a String or *inbox.createXOAuthGenerator* object

Example:

    var client = inbox.createConnection(false, "imap.gmail.com", {
        secureConnection: true,
        auth:{
            user: "test.nodemailer@gmail.com",
            pass: "Nodemailer123"
        }
    });

Or when login with XOAUTH (see examples/xoauth.js)
    
    var client = inbox.createConnection(false, "imap.gmail.com", {
        secureConnection: true,
        auth:{
            XOAuthToken: inbox.createXOAuthGenerator({
                user: "test.nodemailer@gmail.com",
                token: "1/Gr2OVA2Ol64fNyjZCns-bkRau5eLisbdlEa_HSuTaEk",
                tokenSecret: "ymFpseHtEnrIsuL8Ppbfnnk3"
            })
        }
    });
        
Once the connection object has been created, use connect() to create the actual connection.

    client.connect();
    
When the connection has been successfully established a 'connect' event is emitted.

    client.on("connect", function(){
        console.log("Successfully connected to server");
    });

### List available mailboxes

To get the list of available mailboxes, use

    client.getMailboxList()

which returns the mailbox list

Example

    console.log(client.getMailboxList());

Output:

    { 
        INBOX: { name: 'INBOX', inbox: true },
        Drafts: { name: 'Drafts' },
        Sent: { name: 'Sent', disabled: true},
        Junk: { name: 'Junk' }
    }

### Select a mailbox

Before you can check mailbox contents, you need to select one with

    client.openMailbox(name[, options], callback)
    
Where

  * **name** is the name of the mailbox (ie. "INBOX")
  * **options** is an optional options object
  * **options.readOnly** - if set to true, open the mailbox in read-only mode (downloading messages does not update seen/unseen flag)
  * **callback** *(error, mailbox)* is a callback function to run after the mailbox has been opened. Has an error param in case the opening failed and a mailbox param with the properties of the opened mailbox.

Example

    client.on("connect", function(){
        client.openMailbox("INBOX", function(error, mailbox){
            if(error) throw error;
            console.log("Message count in INBOX: " + mailbox.count);
        });
    });

### Listing e-mails

Once a mailbox has been opened you can list contained e-mails with

    client.listMessages(from[, limit], callback)

Where

  * **from** is the index of the first message (0 based), you can use negative numbers to count from the end (-10 indicates the 10 last messages)
  * **limit** defines the maximum count of messages to fetch, if not set or 0 all messages from the starting position will be included
  * **callback** *(error, messages)* is the callback function to run with the message array
  
Example

    // list newest 10 messages
    client.listMessages(-10, function(err, messages){
        messages.forEach(function(message){
            console.log(message.UID + ": " + message.title);
        });
    });

Example output for a message listing

    [
        { 
            // if uidvalidity changes, all uid values are void!
            UIDValidity: '664399135',
            
            // uid value of the message
            UID: 52,
            
            // message flags (Array)
            flags: [ '\\Flagged', '\\Seen' ],
            
            // date of the message (Date object)
            date: Wed, 25 Apr 2012 12:23:05 GMT,
            
            title: 'This is a message, may contain unicode symbols',
            
            // single "from:" address
            from: { 
                name: 'Andris Reinman', 
                address: 'andris.reinman@gmail.com' 
            },
            
            // an array of "to:" addresses
            to: [
                {
                    name: 'test nodemailer',
                    address: 'test.nodemailer@gmail.com'
                }
            ],
            
            // an array of "cc:" addresses
            cc: [
                {
                    name: 'test nodemailer',
                    address: 'test.nodemailer@gmail.com'
                }
            ],
            
            messageId: '<04541AB5-9FBD-4255-81AA-18FE67CB97E5@gmail.com>' 
        },
        ...
    ]
    
**NB!** if some properties are not present in a message, it may be not included
in the message object - for example, if there are no "cc:" addresses listed, 
there is no "cc" field in the message object 

### Fetch message details

To fetch message data (flags, title, etc) for a specific message, use

    client.fetchData(uid, callback)
    
Where

  * **uid** is the UID value for the mail
  * **callback** *(error, message)* is the callback function to with the message data object (or null if the message was not found). Gets an error parameter if error occured

Example

    client.fetchData(123, function(error, message){
        console.log(message.flags);
    });

### Fetch message contents

Message listing only retrieves the envelope part of the message. To get the full RFC822 message body
you need to fetch the message.

    var messageStream = client.createMessageStream(uid)
    
Where

  * **uid** is the UID value for the mail

Example (output message contents to console)

    client.createMessageStream(123).pipe(process.stdout, {end: false});

**NB!** If the opened mailbox is not in read-only mode, the message will be 
automatically marked as read (\Seen flag is set) when the message is fetched.

### Message flags

You can add and remove message flags like `\Seen` or `\Answered` with `client.addFlags()` and `client.removeFlags()`

**Add flags**

    client.addFlags(uid, flags, callback)

Where

  * **uid** is the message identifier
  * **flags** is the array of flags to be added
  * **callback** *(error, flags)* is the callback to run, gets message flags array as a parameter 

**Remove flags**

    client.removeFlags(uid, flags, callback)

Where

  * **uid** is the message identifier
  * **flags** is the array of flags to be removed
  * **callback** *(error, flags)* is the callback to run, gets message flags array as a parameter

Example

    // add \Seen and \Flagged flag to a message
    client.addFlags(123, ["\\Seen", "\\Flagged"], function(err, flags){
        console.log("Current flags for a message: ", flags);
    });
    
    // remove \Flagged flag from a message
    client.removeFlags(123, ["\\Flagged"], function(err, flags){
        console.log("Current flags for a message: ", flags);
    });

### Wait for new messages

You can listen for new incoming e-mails with event "new"

    client.on("new", function(message){
        console.log("New incoming message " + message.title);
    });
    
## Complete example

Listing newest 10 messages:

    var inbox = require("inbox");
    
    var client = inbox.createConnection(false, "imap.gmail.com", {
        secureConnection: true,
        auth:{
            user: "test.nodemailer@gmail.com",
            pass: "Nodemailer123"
        }
    });
    
    client.connect();
    
    client.on("connect", function(){
        client.openMailbox("INBOX", function(error, mailbox){
            if(error) throw error;
            
            client.listMessages(-10, function(err, messages){
                messages.forEach(function(message){
                    console.log(message.UID + ": " + message.title);
                });
            });

        });
    });