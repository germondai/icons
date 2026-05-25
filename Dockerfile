# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.3.14-slim AS base

# set working directory
WORKDIR /app

# Install openssl
RUN apt-get update -y && apt-get install -y openssl

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp
COPY package.json bun.lock /temp/
RUN cd /temp && \
    bun --bun install --ignore-scripts --shamefully-hoist --frozen-lockfile

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/node_modules node_modules
COPY . .

# zenstack:generate, prisma:deploy, build and compress
ENV NODE_ENV=production
RUN bun build \
	--compile \
	# If your are using telemetry, you can enable the following minification options and disable the general --minify flag
	# --minify-whitespace \
	# --minify-syntax \
    # If you uncommented the lines above, you should comment the --minify flag line below
	--minify \
	--outfile server \
	src/index.ts

# create final image with distroless for smaller size and improved security
FROM base AS release

# set working directory
WORKDIR /app

# copy the built server from the prerelease stage
COPY --from=prerelease /app /app

# set environment variables
ENV NODE_ENV=production

# expose the listening port
EXPOSE 3000:3000

# run the server
ENTRYPOINT ["./server"]
