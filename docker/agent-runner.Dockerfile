FROM node:18-alpine

# Install git for version control operations
RUN apk add --no-cache git

# Configure git defaults
RUN git config --global user.email "agent@vibekanban.dev" && \
    git config --global user.name "Vibe Agent" && \
    git config --global init.defaultBranch main

WORKDIR /workspace
