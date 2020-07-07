
const crypto = require('crypto')

let jsonHeaders = new Headers([["Content-Type", "application/json"]])

async function sendText(message){
  let headers = new Headers();
  headers.append("Authorization","Basic " + Buffer.from(accountSid + ":" + authToken).toString('base64'))
  headers.append("Content-Type", "application/x-www-form-urlencoded")

  const endpoint = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json"

  let encoded = new URLSearchParams()
  encoded.append("To",recipient)
  encoded.append("From", '+19388887573')
  encoded.append("Body", message)

  const request = {
    body: encoded,
    method: 'POST',
    headers: headers
  }

  let result = await fetch(endpoint, request)
  result = await result.json()

  return new Response(JSON.stringify(result), request)
}

async function createHexSignature(requestBody) {
  let hmac = crypto.createHmac('sha1', SECRET_TOKEN)
  hmac.update(requestBody,'utf-8')

  return hmac.digest('hex')
}

async function checkSignature(request) {
  let expectedSignature = await createHexSignature(await request.text())
  let actualSignature = await request.headers.get("X-Hub-Signature")

  return expectedSignature === actualSignature
}

addEventListener("fetch", event => {
  event.respondWith(githubWebhookHandler(event.request))
})

function simpleResponse(statusCode, message) {
  let resp = {
    message: message,
    status: statusCode
  }

  return new Response(JSON.stringify(resp), {
    headers: jsonHeaders,
    status: statusCode
  })
}

async function githubWebhookHandler(request) {
  if (request.method !== "POST") {
    return simpleResponse(
      200,
      `Please send a POST request :)`
    )
  }
  try {
    const formData = await request.json()
    const repo_name = formData.repository.full_name
    const action = await request.headers.get("X-GitHub-Event")
    const sender_name = formData.sender.login

    if (!checkSignature(request)) {
      return simpleResponse(403, "Incorrect Secret Code")
    }
    
    return await sendText(`${sender_name} performed ${action} on ${repo_name}`)

  } catch (e) {
    return simpleResponse(
      200,
      `Error:  ${e} `
    )
  }
}
