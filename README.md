# Projection Lab

An interactive learning lab with vector projections, projections onto subspaces, and step-by-step Gram–Schmidt, in both 2D and 3D.

Run `node server.cjs` in this directory and open http://127.0.0.1:4173. No build or dependencies are required. The deployable site is in `dist/`.

Drag vector tips in 2D; orbit the camera by dragging in 3D. Coordinate inputs work in both dimensions. In the subspace example, 2D uses a line, while 3D offers a line or a plane. Nonorthogonal spanning vectors are orthonormalized before summing their projection terms. Dependent inputs are detected and skipped.

Gram–Schmidt shows the input, each projection subtraction, normalization, and final orthonormal system. Projection arrows are drawn head-to-tail so the decomposition is visible. The calculations use the Euclidean inner product.
