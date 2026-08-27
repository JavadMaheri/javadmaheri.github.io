<!--
  Shared between /work-experience/ and /resume/ so job entries are edited
  in exactly one place.
  TODO(user) CONFLICT TO RESOLVE: your brief and CV1 both name "Zarebin" as
  the employer for the graph-ranking / Laplacian-learning work below. CV2
  describes the same work as an "Undergraduate Researcher" position at
  Sharif University of Technology instead, with no mention of Zarebin.
  This currently uses the Zarebin version, since that is what your own
  brief explicitly stated. Confirm which is correct and I'll fix it.
-->

### PhD Researcher
**EURECOM / Sorbonne Université** — Huawei France Chair for Future Wireless Networks · Biot, France<br>
*April 2023 – July 2026 · Supervisor: Prof. Petros Elia*

- Built the first universally optimal allocation schemes for a general class of distributed problems: one task-blind assignment that is simultaneously optimal across all downstream workloads, removing the need to re-plan data placement per job.
- Derived matching information-theoretic lower bounds and explicit combinatorial constructions achieving them, cutting inter-node communication load to its provable minimum on MapReduce-style workloads.
- Designed and ran the full experimental program in Python (PyTorch, NumPy).

### Data Scientist / ML Engineer
**Zarebin** · Tehran<br>
*March 2022 – December 2022*

- Implemented PageRank and personalized PageRank over multi-million-edge graphs on Apache Spark / GraphX, using the Pregel-style message-passing API to keep iterative computation distributed rather than collapsing it onto a driver node.
- Learned graph structure from data instead of assuming it: convex graph Laplacian estimation under smoothness and sparsity constraints to infer market-dependency graphs from raw price series.
- Benchmarked learned graphs against correlation baselines on downstream ranking and clustering quality; delivered the pipeline to the client's analytics team.

### ML Engineer (Intern / Research) — GNNs for HSE Video Analytics
**MAPNA** — Industrial Power Generation Facility · Tehran<br>
*April 2021 – January 2022*

- Built a scene-graph GNN on top of a detection backbone — people, machinery, PPE and restricted zones as nodes, spatial and temporal relations as edges — classifying Health, Safety & Environment violations from interactions (unsafe proximity, missing helmet or vest, restricted-area entry) rather than isolated per-frame detections.
- Cut false alarms substantially against the per-frame detector baseline by letting message passing resolve occlusion and viewpoint ambiguity across overlapping cameras.
- Formulated camera configuration as graph optimization: modelled the installation as a coverage graph over field-of-view overlaps and hazard zones, then ranked placement, orientation and resolution settings to improve hazard-zone coverage without adding hardware.
