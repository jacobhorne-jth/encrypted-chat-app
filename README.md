# encrypted-chat-app

A full-stack end-to-end encrypted chat built with FastAPI + WebSockets + React (Vite).
Clients generate RSA keypairs, exchange an AES-GCM session key via RSA-OAEP, and then chat with AES-encrypted messages the server never decrypts.

**Live Demo: https://encrypted-chat-app-frontend.netlify.app/**

_(If your Netlify slug differs, replace the URL above.)_]

**Important**

For the demo, click the live demo link above twice and open two tabs. Register two users (ex. user1 and user2) and add each other as reciepients to fully test the app's capabilities and observe the encrypted chatting.


_Note on Loading Time_
```text
Because the web app is hosted on a free render service, it automatically goes to sleep after periods of
inactivity. If you visit the app after it has been idle, the first request can take up to 60 seconds to
respond while the server wakes up. Subsequent requests should be much faster. Please be patient.
```

Frontend: https://encrypted-chat-app-frontend.netlify.app/

Backend: https://encrypted-chat-app-api-hxe2.onrender.com

---

**Features**
- Per-user RSA-OAEP keypair generated in the browser on login
- Public key upload to the backend; private key never leaves the browser
- One-click “Add recipient”: generates fresh AES-GCM 256-bit session key and
securely shares it to the recipient (encrypted with their RSA public key)
- Chat messages encrypted client-side (IV + ciphertext) and relayed over WebSocket
- The server never sees plaintext and simply broadcasts opaque payloads
- Minimal, centered dark UI with a compact “Add recipient” + message box flow
- Works locally and with Render (API) + Netlify (frontend)

---

**Project Structure**
```text
encrypted-chat-app/
├── backend/
│   ├── main.py                 # FastAPI routes + WebSocket broadcast + CORS
│   ├── models.py               # SQLModel User table (username, hashed_password, public_key)
│   ├── schemas.py              # Pydantic request models
│   └── requirements.txt        # fastapi, uvicorn, sqlmodel, passlib[bcrypt], python-jose, etc.
│
└── frontend/
    ├── index.html              # Vite entry
    ├── package.json
    ├── public/
    └── src/
        ├── App.jsx             # Auth, RSA keypair gen/upload, layout
        ├── Chat.jsx            # WebSocket client, key exchange, AES encrypt/decrypt
        ├── cryptoUtils.js      # WebCrypto helpers (RSA, AES-GCM)
        ├── index.css           # global styles (dark)
        └── main.jsx            # React bootstrap
```

---

**How to Run Locally**

1. Clone the repository:
```text
git clone https://github.com/jacobhorne-jth/encrypted-chat-app.git
cd encrypted-chat-app
```
2. Backend (FastAPI)
```text
cd backend
python -m venv venv
# macOS/Linux
source venv/bin/activate
# Windows
# venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API at http://localhost:8000
# Swagger: http://localhost:8000/docs
```
3. Frontend (React/Vite)
```text
cd ../frontend
npm install
# create a local .env so the frontend hits your local API
printf "VITE_API_BASE=http://localhost:8000\n" > .env
npm run dev
# open http://localhost:5173
```

---


**Example Workflow**

1. Open two browser windows. Register/login two users (e.g., user1 and user2).
2. In each window, click Add recipient and enter the other username.
You should see “Session key received.” on both sides.
3. Start chatting. Messages decrypt only for users holding the shared AES key.


---

**Deployment**

_Backend: Render (free tier)_

- **Blueprint:** New Web Service → connect this repo

- **Build command:**
`pip install -r backend/requirements.txt`

- **Start command:**
`uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

- Ensure `allow_origins` in `backend/main.py` includes your Netlify site URL (no trailing slash)

_Frontend: Netlify (free)_

- Base directory: `frontend/`

- Build command: `npm ci && npm run build`

- Publish directory: `frontend/dist`

- Env variables:

  - `VITE_API_BASE=https://encrypted-chat-app-api-hxe2.onrender.com`

- Deploy. If you change the Netlify site URL, update CORS in `main.py` and redeploy the backend.


---


**Security Notes**
- RSA private keys and AES session keys live only in memory in the browser.
- Refreshing/logging out clears the session key; share again via Add recipient.
- This is a demo and hasn’t undergone a formal security audit.

---

**Example**




---

**License**

This project is licensed under the MIT License.

**Acknowledgments**
- FastAPI, SQLModel, Uvicorn
- React, Vite
- WebCrypto API (RSA-OAEP, AES-GCM)
- Render, Netlify
