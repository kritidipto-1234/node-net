Lets pretend that we have a real nextjsServer that serves a static html.
Now this static client side js connects with a wssServer.
I have a requirement where the wssServer requires me to send an authHeader called isLoggedin true ,if it doesnt receive that it refuses to connect
but the problem is  from web wss we cant send custom request header.

What i want is ti be able to leverage the nextjs server as a proxy .
SO client connects with the wss server but thru nextjs server.

This is a demo to learn so keep the code at minimal non fluffy, it doesnt have to be production ready. I just need to understand the basics