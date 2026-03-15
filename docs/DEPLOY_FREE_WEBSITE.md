# Deploy Website Mien Phi (Frontend + Backend)

Muc tieu: public web cho moi nguoi truy cap duoc ngay, khong can chay local.

## 1) Deploy Backend len Render (free)

- File da co san: `render.yaml` o root repo.
- Render -> New -> Blueprint -> connect repo -> chon service `wealthwallet-api`.
- Render se dung:
  - `rootDir`: `backend-java`
  - `buildCommand`: `mvn -DskipTests clean package`
  - `startCommand`: `java -Dserver.port=$PORT -jar target/wealthwallet-api-0.1.0.jar`
  - `healthCheckPath`: `/actuator/health`

Sau khi xong, ban se co URL dang:
- `https://<ten-service>.onrender.com`

API base se la:
- `https://<ten-service>.onrender.com/api`

## 2) Deploy Frontend len Vercel (free)

- Root project: `frontend-react`
- Build command: `npm run build`
- Output directory: `dist`
- File da co san: `frontend-react/vercel.json` (rewrite cho SPA route)

Dat environment variable tren Vercel:
- `VITE_API_BASE_URL=https://<ten-service>.onrender.com/api`

Sau khi xong, ban se co URL dang:
- `https://<ten-project>.vercel.app`

## 3) Gan ten mien nhu website that

Neu ban co domain rieng:
- Tro A/CNAME cho frontend vao Vercel domain.
- Tao subdomain `api.<tenmien>` tro vao Render domain.
- Set lai `VITE_API_BASE_URL=https://api.<tenmien>/api` va redeploy frontend.

Neu chua mua domain:
- Dung tam `*.vercel.app` + `*.onrender.com` van la website public.

## 4) Luu y quan trong cho ban demo

- Render free co cold start khi idle.
- Backend dang dung profile `local` (H2 memory), du lieu co the reset khi service restart.
- Neu can du lieu ben vung, doi sang DB managed (MySQL/Postgres) cho giai doan tiep theo.
