# 開発用Dockerfile
FROM node:20-alpine

WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm install

# アプリケーションコードのコピー（開発時はボリュームマウントするため、ビルド用）
COPY . .

# Vite の開発サーバーはデフォルトで 5173 ポート
EXPOSE 5173

# ホストからのアクセスを許可するために --host を指定
CMD ["npm", "run", "dev", "--", "--host"]
