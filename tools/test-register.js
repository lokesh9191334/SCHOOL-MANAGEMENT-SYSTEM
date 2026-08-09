// test-register.js
const url = 'http://localhost:5000/api/auth/register'
const body = { email: 'test-register@example.com', password: 'Test1234!', name: 'Test Register' }

async function run(){
  try{
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    console.log('STATUS', res.status)
    console.log('HEADERS', res.headers.get('content-type'))
    console.log('BODY', text)
  }catch(err){
    console.error('Fetch error', err)
  }
}

run()
