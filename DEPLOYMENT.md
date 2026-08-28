# VeilChat Deployment Guide

## Option 1: Deploy on Render (Recommended - Full Stack)

### Prerequisites
- GitHub account
- Render account (free at https://render.com)

### Steps:

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy Backend on Render**
   - Go to https://render.com and sign in
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Configure:
     - **Name**: veilchat-server
     - **Region**: Oregon (or closest to you)
     - **Branch**: main
     - **Root Directory**: `server`
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment Variables**:
       - `NODE_ENV`: production
       - `DATABASE_URL`: (Render will auto-generate PostgreSQL)
       - `JWT_SECRET`: (click generate)
       - `PORT`: 3001
       - `CORS_ORIGIN`: https://veilchat-client.onrender.com (your frontend URL)

3. **Deploy Frontend on Render (Static Site)**
   - Click "New +" → "Static Site"
   - Connect your GitHub repo
   - Configure:
     - **Name**: veilchat-client
     - **Branch**: main
     - **Root Directory**: `client`
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `dist`
     - **Environment Variables**:
       - `VITE_API_URL`: https://veilchat-server.onrender.com (your backend URL)
       - `VITE_WS_URL`: wss://veilchat-server.onrender.com

4. **Update CORS in Backend**
   - Once both services are deployed, update the backend's `CORS_ORIGIN` env var with the actual frontend URL

---

## Option 2: Netlify (Frontend Only) + Render (Backend)

### Frontend on Netlify:
1. Push code to GitHub
2. Go to https://netlify.com
3. Click "Add new site" → "Import from Git"
4. Select your repo
5. Build settings:
   - **Base directory**: `client`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `dist`
6. Add environment variables:
   - `VITE_API_URL`: your-render-backend-url
   - `VITE_WS_URL`: wss://your-render-backend-url

### Backend on Render:
Follow steps 2 above.

---

## Option 3: Railway (Easiest Full-Stack)

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repo
4. Railway will auto-detect services
5. Add PostgreSQL database from Railway marketplace
6. Set environment variables as needed

---

## Post-Deployment Checklist

✅ Update `CORS_ORIGIN` in backend to match frontend URL  
✅ Ensure WebSocket URL uses `wss://` (secure)  
✅ Test username search functionality  
✅ Test connection requests (send/accept/decline)  
✅ Verify profile picture uploads work  
✅ Check that settings persist correctly  

## Troubleshooting

**WebSocket Connection Failed:**
- Ensure backend uses `wss://` not `ws://`
- Check CORS settings allow the frontend origin
- Verify PORT is set correctly (Render uses internal port)

**Database Errors:**
- Ensure DATABASE_URL is set in environment variables
- Run migrations: `npx drizzle-kit push`

**CORS Errors:**
- Update CORS_ORIGIN to exact frontend URL (no trailing slash)
- Restart backend service after changing env vars

---

## Quick Deploy Commands

```bash
# Install dependencies
pnpm install

# Build everything
pnpm build

# Push to GitHub
git add .
git commit -m "Deploy ready"
git push
```

Then follow the platform-specific steps above!
