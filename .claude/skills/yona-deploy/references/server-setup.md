# Cài cổng deploy yona.vn trên server

Founder chạy bằng root, một lần (và mỗi khi `scripts/deploy-gate.sh` đổi — bản trên server mới là bản có hiệu lực,
nên AI không thể tự nới quyền của mình bằng một commit).

## 1. Cài cổng từ `origin/main`

```bash
git -C /www/wwwroot/yona.vn fetch --quiet origin main
git -C /www/wwwroot/yona.vn show origin/main:scripts/deploy-gate.sh > /usr/local/sbin/yona-deploy-gate
chown root:root /usr/local/sbin/yona-deploy-gate && chmod 755 /usr/local/sbin/yona-deploy-gate
```

## 2. Key (hai cách)

**Dùng key root sẵn có** (founder đang dùng `~/.ssh/github_ed`): không cần làm gì trên server, chỉ đặt
`PROD_DEPLOY_SSH_KEY` trong `.env`. Server không giới hạn key này — cổng chỉ là quy ước, AI giữ bằng luật trong SKILL.md.

**Key riêng bị buộc vào cổng** (nên dùng cho thành viên, hoặc khi muốn server tự chặn):
`<PUBKEY>` là nội dung `~/.ssh/yona_deploy.pub` ở máy người đó
(chưa có: `ssh-keygen -t ed25519 -N '' -C "yona-deploy-<tên>" -f ~/.ssh/yona_deploy`).

```bash
echo 'restrict,command="/usr/local/sbin/yona-deploy-gate" <PUBKEY>' >> /root/.ssh/authorized_keys
```

`restrict` tắt mọi forward, pty, agent; `command=` buộc key chỉ chạy cổng, bất kể người gọi gõ gì.
Key này tách khỏi key tunnel DB (`yona_prod_db`) và khỏi key root cá nhân; người đó đặt
`PROD_DEPLOY_SSH_KEY=~/.ssh/yona_deploy` trong `.env`.

## 3. Thử từ máy dev

```bash
.claude/skills/yona-deploy/scripts/remote.sh status
.claude/skills/yona-deploy/scripts/remote.sh plan
.claude/skills/yona-deploy/scripts/remote.sh 'id; ls /'     # cổng phải từ chối
```

## Thu hồi

```bash
sed -i '/yona-deploy-<tên>/d' /root/.ssh/authorized_keys
```
