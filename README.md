# MFEC Project Tracker

ติดตามโครงการ MFEC Infrastructure ผ่านไฟล์ Excel `.xlsx` — อัปโหลดแล้วได้ Dashboard ทันที

## 📋 โครงสร้างโปรเจกต์

```
.
├── index.html          # หน้า Landing + App shell
├── styles.css          # Styles ทั้งหมด
├── js/
│   ├── app.js          # App controller
│   ├── dashboard.js    # Dashboard view
│   ├── projects.js     # Projects view
│   ├── report.js       # Report view
│   ├── upload.js       # File upload handler
│   └── util.js         # Utilities
├── libs/
│   └── xlsx.full.min.js  # SheetJS library (อ่าน Excel)
├── deployment.yaml     # OpenShift Deployment (legacy)
├── pipeline-tracker-pod.yaml  # OpenShift Pod + Cloudflare Tunnel
├── package.json        # xlsx dependency
└── README.md
```

## 🚀 Deploy บน OpenShift

### เงื่อนไขrequisite
- `oc` CLI (v4.22+)
- Permission เข้าถึง cluster `api.ailab.mfec.co.th:6443`
- Username: `ocpadmin`

### 1. Login

```bash
oc login https://api.ailab.mfec.co.th:6443 \
  --insecure-skip-tls-verify \
  --username=ocpadmin \
  --password=<password>
```

### 2. สร้าง Namespace

```bash
oc new-project mfec-project-tools
```

### 3. สร้าง ConfigMaps

```bash
# Root files (index.html, styles.css)
oc create configmap pipeline-tracker-root \
  --from-file=index.html=./index.html \
  --from-file=styles.css=./styles.css \
  -n mfec-project-tools

# JS files
oc create configmap pipeline-tracker-js \
  --from-file=app.js=./js/app.js \
  --from-file=dashboard.js=./js/dashboard.js \
  --from-file=projects.js=./js/projects.js \
  --from-file=report.js=./js/report.js \
  --from-file=upload.js=./js/upload.js \
  --from-file=util.js=./js/util.js \
  -n mfec-project-tools

# XLSX library (ใหญ่ 881KB — ใช้ dry-run + replace)
oc create configmap pipeline-tracker-xlsx \
  --from-file=xlsx.full.min.js=./libs/xlsx.full.min.js \
  --dry-run=client -o json | oc replace -f - -n mfec-project-tools
```

### 4. Deploy Pod + Cloudflare Tunnel

```bash
oc apply -f pipeline-tracker-pod.yaml -n mfec-project-tools
```

ไฟล์ `pipeline-tracker-pod.yaml` ประกอบด้วย:
- **Pod** ชื่อ `pipeline-tracker`
- **Container 2 ตัว**:
  - `httpd`: busybox:1.36 รัน httpd ฟัง port 8080
  - `cloudflared`: tunnel ไปยัง `http://localhost:8080`

### 5. ตรวจสอบ

```bash
oc get pods -n mfec-project-tools
oc logs pipeline-tracker -n mfec-project-tools -c cloudflared
```

Tunnel URL จะแสดงใน log ของ cloudflared ประมาณ:
```
https://xxxx-xxxx-xxxx.trycloudflare.com
```

### 6. ลบ Route (ถ้ามีจากเดิม)

หากDeployด้วย `deployment.yaml` เก่าที่มี Route อยู่แล้วให้ลบออก:
```bash
oc delete route pipeline-tracker -n mfec-project-tools
```

เพราะ Cloudflare Tunnel เข้าแทนที่ Route แล้ว

## 📁 ไฟล์ Deploy

| ไฟล์ | รายละเอียด |
|------|-------------|
| `pipeline-tracker-pod.yaml` | Pod + Cloudflare Tunnel (แนะนำ) |
| `deployment.yaml` | Deployment + Service + Route (เดิม) |

## 🔧 อัปเดตไฟล์ static

เมื่อแก้ `index.html` หรือไฟล์อื่น ๆ:

```bash
# อัปเดต ConfigMap
oc create configmap pipeline-tracker-root \
  --from-file=index.html=./index.html \
  --from-file=styles.css=./styles.css \
  --dry-run=client -o json | oc replace -f - -n mfec-project-tools

# Pod จะดึงไฟล์ใหม่โดยอัตโนมัติภายใน ~1 นาที
```

## 🌐 เข้าถึง

- **Cloudflare Tunnel**: `https://xxxx-xxxx-xxxx.trycloudflare.com`
- **Route (ถ้าใช้ deployment.yaml)**: `pipeline-tracker-mfec-project-tools.apps.ailab.mfec.co.th`

## 📝 Notes

- Namespace ต้องเป็นตัวเล็กและใช้ hyphen เท่านั้น (RFC 1123): `mfec-project-tools`
- ConfigMap key ไม่สามารถมี `/` ได้ — จึงต้องแบ่งเป็น ConfigMap คนละ level
- xlsx.full.min.js ใหญ่เกือบ 1MB — ต้องใช้ `oc replace` ไม่ใช่ `oc apply` เพื่อหลีกเลี่ยง annotation limit
- busybox:1.36 ไม่มี USER directive จึงใช้ได้กับ ConfigMap volumes บน cluster นี้
