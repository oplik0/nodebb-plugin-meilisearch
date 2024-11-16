# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 16, 14, 12, 16-bullseye, 14-bullseye, 12-bullseye, 16-buster, 14-buster, 12-buster
ARG VARIANT=20-bookworm
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${VARIANT}

USER node

# Install MongoDB command line tools
ARG MONGO_TOOLS_VERSION=8.0
RUN sudo apt-get update && export DEBIAN_FRONTEND=noninteractive && sudo apt-get install -y gnupg &&\
    curl -fsSL "https://www.mongodb.org/static/pgp/server-${MONGO_TOOLS_VERSION}.asc" | sudo gpg -o /usr/share/keyrings/mongodb-server-${MONGO_TOOLS_VERSION}.gpg --dearmor &&\
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-${MONGO_TOOLS_VERSION}.gpg ] http://repo.mongodb.org/apt/debian $(lsb_release -cs)/mongodb-org/${MONGO_TOOLS_VERSION} main" | sudo tee /etc/apt/sources.list.d/mongodb-org-${MONGO_TOOLS_VERSION}.list &&\
    sudo apt-get update && export DEBIAN_FRONTEND=noninteractive &&\
    sudo apt-get install -y mongodb-database-tools mongodb-mongosh &&\
    sudo apt-get clean -y && sudo rm -rf /var/lib/apt/lists/*;

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# install grunt globally
RUN npm install --global grunt-cli

WORKDIR /opt/nodebb
RUN git clone https://github.com/NodeBB/NodeBB /opt/nodebb
COPY --chown=node:node ["./config.json", "/opt/nodebb/"]

# preemptively copy package.json, since to use yarn nconf will need to be installed before setup
RUN cp /opt/nodebb/install/package.json /opt/nodebb/package.json

CMD grunt -b /opt/nodebb --gruntfile /opt/nodebb/Gruntfile.js
ENTRYPOINT grunt -b /opt/nodebb --gruntfile /opt/nodebb/Gruntfile.js
