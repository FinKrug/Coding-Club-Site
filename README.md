## Coding-Club-Site

One of my current passion projects is developing the Coding Club website. This project is still a work in progress, but its main goal is to create an engaging and accessible platform that encourages more people to learn programming and explore the world of technology.

Through this website, I aim to provide resources, project showcases, event information, and opportunities for members to collaborate and grow their technical skills. I want the platform to make coding feel approachable for beginners while also giving experienced programmers a place to connect, share ideas, and build exciting projects together.

As development continues, I plan to expand the site's features and content based on community feedback. Ultimately, my vision is for the website to inspire curiosity, foster creativity, and help more people discover the fun and rewarding experience of coding.

# Getting This Website Running

Welcome! If you've never worked with a website project before, don't worry. Follow the steps below and you'll have the site running on your computer.

---

# Step 1: Install Node.js

This project uses React, which requires Node.js to run.

1. Go to https://nodejs.org
2. Download the **LTS (Long-Term Support)** version.
3. Install it using the default settings.

After installation, verify it worked:

### Windows

Open **Command Prompt** and run:

```bash
node -v
npm -v
```

### Mac/Linux

Open **Terminal** and run:

```bash
node -v
npm -v
```

You should see version numbers displayed. If you do, you're ready to continue.

---

# Step 2: Download the Project

### Option A: Download ZIP

1. Open the GitHub repository.
2. Click the green **Code** button.
3. Select **Download ZIP**.
4. Extract the ZIP file somewhere on your computer.

### Option B: Clone with Git

If you have Git installed:

```bash
git clone <repository-url>
```

---

# Step 3: Open a Terminal in the Project Folder

Navigate to the folder containing this project.

### Windows

- Open the project folder.
- Hold **Shift** and right-click inside the folder.
- Select **Open PowerShell window here** or **Open in Terminal**.

### Mac

- Open Terminal.
- Type `cd ` (including the space).
- Drag the project folder into the terminal window.
- Press Enter.

---

# Step 4: Install Project Dependencies

In the terminal, run:

```bash
npm install
```

This downloads everything the website needs to run.

The first install may take a few minutes.

---

# Step 5: Start the Website

Run:

```bash
npm start
```

or if the project uses Vite:

```bash
npm run dev
```

The terminal will display a local URL similar to:

```text
http://localhost:3000
```

or

```text
http://localhost:5173
```

Open that URL in your browser.

You should now see the website running locally.

---

# Making Changes

Most of the website code is located in:

```text
src/
```

When you edit files and save them, the browser will automatically refresh and show your changes.

---

# Common Problems

## "node is not recognized"

Node.js is not installed correctly.

Reinstall Node.js from:

https://nodejs.org

Then restart your terminal.

---

## "npm install" fails

Try:

```bash
npm cache clean --force
npm install
```

If the issue continues, delete:

```text
node_modules
package-lock.json
```

Then run:

```bash
npm install
```

again.

---

## Port Already In Use

If you see a message saying the port is already in use:

- Close other running React projects.
- Or allow the application to use a different port when prompted.

---

# Building for Production

When you're ready to deploy the website:

```bash
npm run build
```

This creates an optimized production version of the site.

The output will be generated in:

```text
build/
```

or

```text
dist/
```

depending on the project configuration.

---

# Need Help?

If something isn't working:

1. Make sure Node.js is installed.
2. Run `npm install`.
3. Run `npm start` or `npm run dev`.
4. Read any error messages shown in the terminal.

Most setup issues can be resolved by carefully following the steps above.

Happy coding!