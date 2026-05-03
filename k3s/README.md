# Pipaflow — k3s deployment

SPA static (Vite + React + nginx) → un singur Deployment, fără DB, fără backend.

## Structura

```
k3s/
├── namespace.yaml      # ns: pipaflow
├── deployment.yaml     # nginx servind dist/
├── service.yaml        # ClusterIP :80
├── ingress.yaml        # pipaflow.nexti.ro + TLS
└── kustomization.yaml  # agregare + image tag
```

## Prerequisites pe cluster

Astea trebuie deja făcute pe k3s-ul tău (sunt din TP_CI_CD):
- `cert-manager` instalat
- `ClusterIssuer` numit `letsencrypt-prod`
- Self-hosted registry la `registry.tpforge.com` cu user `admin`
- DNS record: `pipaflow.nexti.ro` → IP server (DNS only pe Cloudflare, NU Proxied)

## Bootstrap (prima dată)

### 1. Build & push imaginea

```bash
# de pe local sau de pe server, în folderul pipaflow/
docker build -t registry.tpforge.com/pipaflow:main .
docker login registry.tpforge.com    # admin / PAROLA_REGISTRY
docker push registry.tpforge.com/pipaflow:main
```

### 2. Creează namespace + registry-secret

```bash
kubectl apply -f k3s/namespace.yaml

kubectl create secret docker-registry registry-secret \
  --docker-server=registry.tpforge.com \
  --docker-username=admin \
  --docker-password='PAROLA_REGISTRY' \
  -n pipaflow
```

### 3. Aplică restul manifestelor

```bash
kubectl apply -k k3s/
```

### 4. Verifică

```bash
kubectl get pods -n pipaflow                # Running
kubectl get certificate -n pipaflow         # READY=True după ~30s
kubectl get ingress -n pipaflow
```

Apoi din browser: https://pipaflow.nexti.ro

## Re-deploy (după modificări)

```bash
# 1. build & push cu tag nou (SHA-ul commit-ului curent)
TAG=$(git rev-parse --short HEAD)
docker build -t registry.tpforge.com/pipaflow:$TAG \
             -t registry.tpforge.com/pipaflow:main .
docker push registry.tpforge.com/pipaflow:$TAG
docker push registry.tpforge.com/pipaflow:main

# 2. Force rollout cu imaginea nouă (același tag :main, doar SHA digest se schimbă)
kubectl rollout restart deployment/pipaflow -n pipaflow
kubectl rollout status deployment/pipaflow -n pipaflow
```

## Schimbă domeniul

În [`ingress.yaml`](ingress.yaml) înlocuiește `pipaflow.nexti.ro` cu noul host (3 locuri: `tls.hosts`, `rules.host`, `secretName` la alegere). Apoi:

```bash
kubectl apply -f k3s/ingress.yaml
```

## Troubleshooting

| Simptom | Cauză probabilă |
|---|---|
| Pod `ImagePullBackOff` | `registry-secret` lipsește (pasul 2) sau parola greșită |
| Certificate `Pending` >2min | DNS nu pointează la server / Cloudflare e Proxied |
| `502 Bad Gateway` | Pod-ul crash-uie — `kubectl logs deploy/pipaflow -n pipaflow` |
| Nginx 404 pe rute interne | nginx.conf nu are SPA fallback (verifică `try_files` în [`../nginx.conf`](../nginx.conf)) |

## Comenzi utile

```bash
kubectl get all -n pipaflow
kubectl logs -f deployment/pipaflow -n pipaflow
kubectl describe pod -n pipaflow
kubectl rollout history deployment/pipaflow -n pipaflow
kubectl rollout undo deployment/pipaflow -n pipaflow      # revert la ultima revizie
```
