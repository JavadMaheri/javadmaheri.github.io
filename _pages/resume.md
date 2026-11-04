---
permalink: /lab/resume/
title: "Resume"
author_profile: true
redirect_from:
  - /resume/
  - /cv/
  - /cv
description: "Resume / CV of Javad Maheri — PhD, EURECOM / Sorbonne Université. Download the PDF or read the summary below."
---

**[Download the full CV (PDF)]({{ "/files/javad-maheri-cv.pdf" | relative_url }})**

<!--
  TODO(user): the section below is a hand-written HTML summary of the CV
  PDF, not generated from it -- this template has no PDF-generation step,
  so the two are NOT automatically kept in sync. When you update the PDF,
  update this page's Education / Skills / Awards text by hand too.
  (Work Experience and Publications below ARE shared with the rest of the
  site: Work Experience comes from _includes/work-experience-body.md, and
  Publications from the _publications collection -- edit those once and
  every page that uses them updates together.)
-->

Education
======
- **Ph.D. in Communication Systems** — Sorbonne Université / EURECOM, Biot, France. 2023–2026; defended July 2026, awarded September 2026. *Thesis: Universally Optimal Combinatorial Schemes for Distributed Computing and Learning.* Advisor: Prof. Petros Elia. Jury: Prof. Dirk Slock (EURECOM), Prof. Michèle Wigger (CentraleSupélec), Prof. Giuseppe Caire (TU Berlin), Prof. Sheng Yang (CentraleSupélec).
- **Graduate coursework, M.Sc. program in Electrical Engineering (Communication Systems)** — Sharif University of Technology, Tehran. 2021–2022. Graduate GPA 19.04/20 (cohort average 16.37).
- **B.Sc. in Electrical Engineering & Mathematics** (minor in Math, high honors) — Sharif University of Technology, Tehran. 2016–2021.

Relevant Coursework
======
*Sharif University of Technology, grades out of 20.*

- **Information & communication:** Information Theory and Coding 19.4 · Special Topics in Communications 20.0 · Adaptive Filters 18.9
- **Probability & statistics:** Stochastic Processes 20.0 · Engineering Probability & Statistics 19.5
- **Learning:** Theory of Machine Learning 20.0 · Deep Learning 19.1 · Tensor Decompositions 19.4 · Compressed Sensing 17.9
- **Optimization:** Convex Optimization II 19.2 · Convex Optimization I 18.5 · Numerical Optimization Methods 18.7
- **Analysis & discrete math:** Real Analysis I 20.0 · Real Analysis II 20.0 · Engineering Mathematics 19.9 · Graph Theory 17.0

Work Experience
======

{% include work-experience-body.md %}

Teaching
======
- **Teaching Assistant** — EURECOM & Sharif University of Technology (2019–2023): Digital Communications · Probability & Statistics · Digital Signal Processing · undergraduate tutorials in Engineering Mathematics and Graph Signal Processing. Problem classes, problem sets and solutions, office hours, and grading.

Skills
======
- **Theory:** Information theory (converse bounds, information measures), network and distributed computing, learning theory, minimax lower bounds (Fano, Le Cam), high-dimensional probability, concentration inequalities, conformal prediction and risk control, convex and online optimization, graph and hypergraph theory, combinatorial designs
- **ML systems:** Mixture-of-experts routing and expert parallelism, Transformers, diffusion models, RLHF / DPO
- **Programming:** Python (advanced), MATLAB, LaTeX (advanced), C/C++ (intermediate)
- **Frameworks:** PyTorch, TensorFlow, NumPy / SciPy, Apache Spark / GraphX, Git, Linux

Selected Publications
======

{% assign sorted_pubs = site.publications | sort: 'date' | reverse %}
{% for p in sorted_pubs %}
- {{ p.authors | markdownify | remove: "<p>" | remove: "</p>" }}. "[{{ p.title }}]({{ p.url | relative_url }})." *{{ p.venue }}*, {{ p.date | date: "%Y" }}. {{ p.status }}.{% if p.arxiv %} [arXiv:{{ p.arxiv }}](https://arxiv.org/abs/{{ p.arxiv }}){% endif %}
{% endfor %}

Full list with abstracts on the [Publications](/lab/publications/) page.

Awards and Honors
======
- Ranked 7th among 180,000+ candidates, Iranian National University Entrance Examination (B.Sc. level)
- High honors graduate, B.Sc. in Electrical Engineering & Mathematics, Sharif University of Technology (2021)
- Fully funded doctoral position, Huawei France Chair for Future Wireless Networks / France 2030 PEPR Networks of the Future (2023–2026)
- ISIT 2024 Chess Event: drew against GM Vassilios Kotronias; featured on EURECOM news and the ISIT 2024 website

Languages
======
English · French (B1, actively improving) · Persian (native)
