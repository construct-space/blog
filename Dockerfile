FROM docker.io/library/ghost:5-alpine

# Install Postgres driver
RUN cd /var/lib/ghost/versions/*/ && npm install pg --legacy-peer-deps

# Copy theme
COPY theme/ /var/lib/ghost/content/themes/construct-blog/

# Copy OAuth bridge
COPY oauth/ /var/lib/ghost/oauth/

# Copy custom boot script
COPY boot.js /var/lib/ghost/boot.js

ENV NODE_ENV=production

EXPOSE 2368

CMD ["node", "/var/lib/ghost/boot.js"]
