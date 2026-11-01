# AI Social Media Content Planner
## Run backend (VS Code terminal 1, project root)
```powershell
py -3.11 -m venv venv
.\\venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```
Add your own Groq API key to `.env` (never commit this file).
```powershell
python -m uvicorn main:app --reload --port 8000
```
## Run frontend (VS Code terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
Open the localhost URL printed by Vite. API docs: http://127.0.0.1:8000/docs
## Push to GitHub
```powershell
git init
git add .
git status
git commit -m "Build AI Social Media Content Planner"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```
Make sure `.env` is not included in the commit.
