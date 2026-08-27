---
permalink: /
title: "Javad Maheri — PhD, EURECOM / Sorbonne Université"
author_profile: true
description: "Javad Maheri, PhD (EURECOM / Sorbonne Université): exact, non-asymptotic limits for distributed computing and learning on graph-structured data, and the systems that use them."
---

I prove exact, non-asymptotic limits for distributed computation and learning on graph-structured data — and I build the systems that use them.

I defended my PhD in Communication Systems at EURECOM / Sorbonne Université in July 2026, supervised by Prof. Petros Elia. My thesis, *Universally Optimal Combinatorial Schemes for Distributed Computing and Learning*, derives matching information-theoretic converses and explicit combinatorial constructions for task and data allocation in distributed systems — bounds that are tight, not just order-optimal. The same combinatorial and information-theoretic toolkit — matching converses paired with constructions that achieve them — extends to graph neural networks and graph signal processing, and to other graph-structured problems in causal inference and integrated sensing and communication (ISAC): different graphs, the same underlying question.

I'm based in Sophia Antipolis, France.

Research interests
======
1. Fundamental limits of distributed computing and learning
2. Combinatorial designs and coded caching
3. Hypergraph partitioning
4. Graph neural networks and graph signal processing
5. Causal inference for spatiotemporal data
6. Integrated sensing and communication (ISAC)

Selected publications
======
{% assign home_pub_slugs = "universal-optimal-allocation-2026,interweaved-cliques-2026,hypergraph-edge-partitioning-2026" | split: "," %}
{% for slug in home_pub_slugs %}
  {% assign p = site.publications | where_exp: "item", "item.permalink contains slug" | first %}
  {% if p %}
- **[{{ p.title }}]({{ p.url | relative_url }})** — {{ p.venue }}, {{ p.date | date: "%Y" }} ({{ p.status }})
  {% endif %}
{% endfor %}

Full list, with links and status, on the [Publications](/publications/) page.
