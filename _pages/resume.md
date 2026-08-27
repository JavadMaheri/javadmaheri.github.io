---
permalink: /resume/
title: "Resume"
author_profile: true
redirect_from:
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
- **Ph.D. in Communication Systems** — Sorbonne Université / EURECOM, Biot, France. Defended July 2026. *Thesis: Universally Optimal Combinatorial Schemes for Distributed Computing and Learning.* Supervisor: Prof. Petros Elia.
- **B.Sc. in Electrical Engineering & Mathematics** (double major, high honors) — Sharif University of Technology, Tehran. 2017–2022. Selected grades: Theory of Machine Learning 20/20, Graph Signal Processing 20/20, Biomedical Signal Processing 19.5/20, Information Theory 19.4/20, Deep Learning 19.1/20.

Work Experience
======

{% include work-experience-body.md %}

Skills
======
- **Languages:** Python (advanced), MATLAB, C/C++, LaTeX, SQL
- **ML / DL:** PyTorch, TensorFlow, NumPy, SciPy, scikit-learn; graph neural networks, transformers and attention, CNNs, transfer learning
- **Distributed & Data:** Apache Spark / GraphX, multi-GPU training, communication-efficient training, MapReduce-style workloads, cluster experiment pipelines
- **Research areas:** Fundamental limits of distributed computing and learning, combinatorial design and coded caching, hypergraph partitioning, information theory, high-dimensional probability, spectral graph theory, graph signal processing, convex optimization

Selected Publications
======

{% assign sorted_pubs = site.publications | sort: 'date' | reverse %}
{% for p in sorted_pubs %}
- {{ p.authors | markdownify | remove: "<p>" | remove: "</p>" }}. "[{{ p.title }}]({{ p.url | relative_url }})." *{{ p.venue }}*, {{ p.date | date: "%Y" }}. {{ p.status }}.{% if p.arxiv %} [arXiv:{{ p.arxiv }}](https://arxiv.org/abs/{{ p.arxiv }}){% endif %}
{% endfor %}

Full list with abstracts on the [Publications](/publications/) page.

Awards and Honors
======
- Ranked 7th nationally among 180,000+ candidates, Iranian National University Entrance Examination (2017)
- High honors graduate, B.Sc. in Electrical Engineering & Mathematics, Sharif University of Technology (2022)
- Fully funded doctoral position, Huawei France Chair for Future Wireless Networks / France 2030 PEPR Networks of the Future (2023–2026)
- ISIT 2024 Chess Event: drew against GM Vassilios Kotronias; featured on EURECOM news and the ISIT 2024 website

Languages
======
English (fluent) · French (B1) · Persian (native)
