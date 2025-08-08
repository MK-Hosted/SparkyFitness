docker buildx build --platform linux/amd64,linux/arm64 -t codewithcj/sparkyfitness:v0.15.0 -f Dockerfile.frontend . --push
docker buildx build --platform linux/amd64,linux/arm64 -t codewithcj/sparkyfitness_server:v0.15.0 -f Dockerfile.backend SparkyFitnessServer --push
