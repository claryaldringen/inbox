var inbox = require(".."),
    util = require("util");
    
var client = inbox.createConnection(false, "imap.gmail.com", {
    secureConnection: true,
    auth:{
        user: "test.nodemailer@gmail.com",
        pass: "Nodemailer123"
    },
    debug: true
});

client.connect();

client.on("connect", function(){
    console.log(client.getMailboxList());
    client.openMailbox("INBOX", function(error, mailbox){
        if(error) throw error;
        
        // List newest 10 messages
        client.listMessages(-10, function(err, messages){
            messages.forEach(function(message){
                console.log(message.UID+": "+message.title);
            });
        });
        
        client.fetchData(52, function(err, message){
            console.log(message); 
        });
        
        //var stream = client.createMessageStream(52);
        //client.createMessageStream(52).pipe(process.stdout, {end: false});
        
        client.updateFlags(52, ["\\Answered", "\\Flagged"], "+", console.log)
        client.removeFlags(52, ["\\Answered", "\\Flagged"], console.log)
        client.addFlags(52, ["\\Flagged"], console.log)
        
    });
    
    // on new messages, print to console
    client.on("new", function(message){
        console.log("New message:");
        console.log(util.inspect(message, false, 7));
        
        client.createMessageStream(message.UID).pipe(process.stdout, {end: false});
        
    });
});
