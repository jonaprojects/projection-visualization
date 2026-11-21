# Projection Lab

An interactive learning lab with vector projections, projections onto subspaces, and step-by-step Gram–Schmidt, in both 2D and 3D.

Run `node server.cjs` in this directory and open http://127.0.0.1:4173. No build or dependencies are required. The deployable site is in `dist/`.

Drag vector tips in 2D; orbit the perspective camera by dragging in 3D (or focus the diagram and use the arrow keys). Plus/minus and the zoom slider adjust scale. The 3D view uses depth-tested, lit mesh arrows, translucent subspace planes, optional height guides, and selectable XY/XZ/YZ camera views. Coordinate inputs work in both dimensions. In the subspace example, 2D uses a line, while 3D offers a line or a plane. Nonorthogonal spanning vectors are orthonormalized before summing their projection terms. Dependent inputs are detected and skipped.

Gram–Schmidt shows the input, each projection subtraction, normalization, and final orthonormal system. Projection arrows are drawn head-to-tail so the decomposition is visible. The calculations use the Euclidean inner product.

Formulas are authored in LaTeX and rendered with locally bundled KaTeX 0.16.11, including accessible MathML. Three.js 0.160.1 provides 3D rendering. Vendor licenses are included in `dist/vendor/`. No CDN connection is required for formulas or graphics. Run `node verify.cjs` for numerical, formula, and geometry checks.
