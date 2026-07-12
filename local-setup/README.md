# MIRROR Local Setup Guide

Welcome! This guide will walk you through setting up and running the MIRROR project on your local computer from A to Z. It is written to be as easy to understand as possible.

## Step 1: Install the Prerequisites
Before running the code, you need to have a few standard tools installed on your computer. If you don't have them, download and install them:

1. **Docker Desktop**: Required to run the infrastructure like the database (PostgreSQL), message broker (RabbitMQ), and cache (Redis). [Download here](https://www.docker.com/products/docker-desktop/).
2. **Node.js (v22)**: Required to run the Angular frontend. [Download here](https://nodejs.org/).
3. **Java 21 (JDK)**: Required to run the Spring Boot backend microservices. [Download here](https://adoptium.net/temurin/releases/?version=21).

---

## Step 2: Add Your Secret Keys
To make the app fully work, you need to provide some API keys. 

1. Right-click the **`start-local-dev.ps1`** file (located in this folder) and open it in a text editor like VS Code or Notepad.
2. Scroll down to the **Environment Variables** section. 

**REQUIRED (You MUST put real values here):**
You can get all of these for free! If you don't provide these, the app will crash or you won't be able to log in.
- **Google Gemini API Key**: [Get it for free here](https://aistudio.google.com/app/apikey).
- **Groq API Key**: [Get it for free here](https://console.groq.com/keys).
- **Firebase Credentials**: Create a free project at [Firebase Console](https://console.firebase.google.com/), enable Web Authentication, and copy the config keys.

**OPTIONAL (You can leave the dummy text):**
You do not need to change these for local testing.
- **Database & JWT Secrets**: These are already pre-filled to connect to your local Docker database. Leave them as-is!
- **Email/SMTP Credentials** (`MAIL_USERNAME`, etc.): You can just leave the dummy text. The app will still work, it just won't be able to send real emails.

3. Save the file once you are done!

---

## Step 3: Start Docker Desktop
Think of Docker like the engine of a car. You need to turn it on before you can drive.
- Open the **Docker Desktop** app on your computer. 
- Wait a moment until the Docker icon shows that the "Engine is running". 
*(Note: Opening Docker Desktop doesn't start the project yet, it just turns on the background service so that our script can talk to it in the next step!)*

---

## Step 4: Run the Project
Now you are ready to start everything!

1. Double-click the **`start-local-dev.ps1`** file in this folder. 
   *(Note: If double-clicking doesn't work, right-click it and select "Run with PowerShell").*
2. **This script is the brains of the operation!** Once you click it, it automatically:
   - Tells Docker exactly which databases to download and start for this specific project.
   - Downloads all required frontend packages if they are missing.
   - Opens 3 new black windows to boot up your backend microservices (Auth, Memory, and API Gateway).
   - Opens 1 new window to boot up your Angular frontend.

---

## Step 5: Start Using the App!
Once all the terminal windows finish loading (it might take a minute or two the first time), you can access the app in your browser:

- **Frontend App**: [http://localhost:4200](http://localhost:4200)
- **API Gateway**: [http://localhost:8060](http://localhost:8060)

### How to stop the app?
When you are done working, simply close all the black terminal windows that popped up. You can also quit Docker Desktop.
