# Reference Fitting: Inverse-Problem Review

The fitting problem is not “predict sliders from pixels.” It is an inverse problem with latent shape q, per-view camera c_v, pose p_v and observations y_v:

L(q,{c_v},{p_v}) = Σ_v [ λ_k L_keypoint(Π(c_v,p_v,X(q)),K_v)
                        + λ_s L_silhouette(R(c_v,p_v,M(q)),S_v) ]
                    + λ_q R_shape(q) + λ_p R_pose(p_v)

## Identifiability rules

1. Never compare image and mesh measurements unless they share anatomical endpoints and a camera normalization.
2. Camera scale/translation/rotation are nuisance parameters. Solve or eliminate them before attributing residual to body shape.
3. Sparse landmarks constrain skeleton proportions strongly but surface girth weakly. Silhouette supplies complementary surface evidence.
4. A parameter may enter optimization only if it has a verified, non-placebo deformation path to production geometry.
5. Avoid duplicate ownership of the same MakeHuman target stem. Otherwise the parameterization is rank-deficient by construction.
6. Keep a shape prior/regularizer. Multi-view silhouettes still permit shapes that project similarly.
7. Treat inferred ML world landmarks as observations with uncertainty, not physical ground truth.

## Required tests

### Synthetic recovery
Generate target observations from known hm08 parameters. Start from neutral and opposite-bound seeds. The solver must reduce objective monotonically and recover observable parameters within tolerance.

### Perturbation
Apply global image scale, translation, mild camera yaw/pitch, mask erosion/dilation, landmark noise, missing side/back views and front/back disagreement. Global similarity transforms must not alter inferred shape.

### Boundary
Exercise every fitted parameter at lower/upper legal bounds and combinations of extremes. No NaN/Inf, target weight explosion, invalid geometry or optimizer escape.

### Observability
Numerically perturb each fitted parameter and record its observation Jacobian J_ij = d observation_i / d parameter_j. Reject parameters whose column norm is near zero. Flag strongly collinear columns: those parameters cannot be independently inferred from the current evidence.

### Regression
For every production reference fixture, store observation vectors and final objective. A change may improve or preserve the objective; unexplained regressions require inspection.

## Next implementation gate

Do not add more fitted shape variables until the numerical Jacobian/observability test exists. The next geometry feature is a CPU image-space projection/rasterization diagnostic for front/side/back. It should solve weak-perspective camera scale and translation from corresponding anatomical landmarks before silhouette comparison.
