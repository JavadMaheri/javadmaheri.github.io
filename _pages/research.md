---
permalink: /research/
title: "Research Profile — Javad Maheri"
author_profile: true
noindex: true
sitemap: false
description: "Research profile of Javad Maheri: exact non-asymptotic limits for distributed computing and learning via combinatorial design theory."
---

<!--
  Unlisted by design: not in _data/navigation.yml, excluded from the XML
  sitemap (sitemap: false, read by jekyll-sitemap), and marked
  noindex/nofollow (via the `noindex: true` flag handled in
  _includes/head.html). No other page links here -- share the URL directly.
-->

I derive exact, non-asymptotic limits for distributed computing and learning on graph- and hypergraph-structured data: converses that hold at finite size, paired with explicit combinatorial constructions that match them. The goal is not order-optimality or asymptotic scaling laws, but exact optimality — schemes whose performance meets the information-theoretic lower bound with matching finite-size constants, so the gap between what is provably necessary and what is achievable closes completely rather than shrinking with scale.

This has meant working at the intersection of information theory and combinatorial design theory. Task and data allocation in distributed computing can be cast as a hypergraph coloring / covering-design problem: I use Interweaved-Cliques constructions — structured overlays of clique decompositions across compute nodes — to build allocation schemes that are simultaneously optimal across every downstream computation task, rather than tuned to one workload at a time. Where such constructions do not directly exist, Steiner-type systems and their near-resolvable relatives supply the combinatorial scaffolding needed to hit the converse exactly, in the same lineage of ideas that underlies coded caching's placement-delivery tradeoff.

A second thread is hypergraph edge partitioning under independent edge sampling: given a hypergraph and a random sampling model over its edges, what is the exact partition quality achievable, and with what finite-size constant, rather than what scaling exponent? Working at this level of precision means the combinatorics has to be exact — enumerative and constructive arguments, not concentration-of-measure heuristics — because the claim is a matching converse, not a bound that is merely tight in an asymptotic sense.

Thesis
======
**Universally Optimal Combinatorial Schemes for Distributed Computing and Learning**

Sorbonne Université / EURECOM — defended July 2026

Supervisor: Prof. Petros Elia

Jury: *TODO(user) — jury list not yet provided; paste names, affiliations, and roles and I'll fill this in.*

Publications
======

{% assign sorted_pubs = site.publications | sort: 'date' | reverse %}
{% assign years = sorted_pubs | map: 'year' | uniq %}
{% for y in years %}
### {{ y }}
{% for p in sorted_pubs %}
{% if p.year == y %}
{% include pub-entry.html post=p expanded=true %}
{% endif %}
{% endfor %}
{% endfor %}

Current directions
======
<!-- TODO(user): tell me what to put here -- which in-progress work is ready
     to be mentioned publicly, and how you want it described. Nothing is
     listed below until you confirm. -->

*TODO — awaiting your go-ahead on what to list here.*

Talks and service
======
<!-- TODO(user): send me a list of talks / reviewing / TPC service, or say
     "none for now". -->

*TODO — none provided yet.*
