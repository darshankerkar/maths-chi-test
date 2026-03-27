# Deployment Guide for Chi-Square Test Application

## Quick Deployment Options

### 🚀 Option 1: Vercel (Frontend) + Render (Backend) - Recommended

#### Frontend Deployment (Vercel)
1. Push code to GitHub
2. Connect your repo to [Vercel](https://vercel.com)
3. Import the `frontend` directory
4. Set environment variable: `VITE_API_URL=https://your-backend-url.onrender.com`
5. Deploy

#### Backend Deployment (Render)
1. Push code to GitHub  
2. Connect your repo to [Render](https://render.com)
3. Create a new Web Service
4. Use the `backend` directory as root
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Deploy

---

### 🐳 Option 2: Docker (Self-hosted)

#### Local Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build
```
Access at: `http://localhost`

#### Production Docker
```bash
# Build image
docker build -t maths-chi-test .

# Run container
docker run -p 8000:8000 maths-chi-test
```

---

### 🌐 Option 3: Netlify (Frontend) + Railway (Backend)

#### Frontend (Netlify)
1. Connect repo to [Netlify](https://netlify.com)
2. Build command: `npm run build` (in frontend directory)
3. Publish directory: `dist`
4. Add redirect rule to handle SPA routing

#### Backend (Railway)
1. Connect repo to [Railway](https://railway.app)
2. Select backend directory
3. Railway will auto-detect Python and deploy

---

### ⚙️ Environment Setup

#### Frontend Environment Variables
Create `.env` in `frontend/` directory:
```env
VITE_API_URL=http://localhost:8000  # Development
# VITE_API_URL=https://your-backend.onrender.com  # Production
```

#### Backend Requirements
- Python 3.13+
- Dependencies in `requirements.txt` (FastAPI, Uvicorn, Pydantic only)
- **No scipy/numpy required** - uses manual chi-square implementation
- No additional environment variables needed

---

### 🔄 CI/CD with GitHub Actions

The repository includes GitHub Actions workflow for automatic deployment:

1. **On push to main**: 
   - Runs tests
   - Auto-deploys frontend to Vercel
   - Auto-deploys backend to Render

2. **Required Secrets**:
   - `VERCEL_TOKEN`
   - `ORG_ID` 
   - `PROJECT_ID`
   - `RENDER_SERVICE_ID`
   - `RENDER_API_KEY`

---

### 📋 Pre-deployment Checklist

- [ ] Update `VITE_API_URL` in frontend for production backend URL
- [ ] Ensure all dependencies are in `requirements.txt` and `package.json`
- [ ] Test locally: `npm run build` and `uvicorn app.main:app`
- [ ] Verify CORS settings in backend for production domains
- [ ] Check that API endpoints work correctly

---

### 🐛 Troubleshooting

#### Common Issues
1. **CORS Errors**: Update backend CORS settings to include frontend domain
2. **Build Failures**: Check Node.js/Python versions in deployment platform
3. **API Connection**: Verify `VITE_API_URL` is correctly set
4. **Port Conflicts**: Ensure backend uses `$PORT` environment variable on cloud platforms

#### Debug Commands
```bash
# Frontend build test
cd frontend && npm run build

# Backend test
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000

# Docker test
docker-compose up --build
```

---

### 📊 Deployment URLs Structure

**Development:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

**Production:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.onrender.com`
- API: `https://your-backend.onrender.com/api/chi-square`
