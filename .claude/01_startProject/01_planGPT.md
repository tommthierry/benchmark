Je pars directement dans le concret : voilà **TA bible** du projet, fusionnée, nettoyée, structurée.
Tu peux littéralement la coller dans un repo (`docs/SABE_CONCEPT.md`) et la faire vivre.

---

# SABE / Sentinelle LLM

**Système Autonome de Benchmarking Évolutif des LLM**

**Version :** 1.0 – Concept & SOW fonctionnel
**Date :** 24 novembre 2025
**Auteur :** Tom, Groupe Conseil ERA
**Statut :** Document de référence (vision, BRD, SOW conceptuel)

---

## 0. Rôle du document

Ce document est la **référence centrale** du projet :

* Document de **vision** (où on va, pourquoi).
* **BRD / Spec fonctionnelle** (ce que le système doit faire, le QUOI).
* **SOW conceptuel** (périmètre, phases, livrables, priorités).
* **Bible du projet** (vocabulaire, concepts, architecture conceptuelle).

Aucun choix technique détaillé (framework, DB, infra) n’est figé ici :
on reste au niveau **concept / métier / architecture logique**.

---

## 1. Vision & philosophie

### 1.1 Vision

> Construire une **Sentinelle des LLM** : un système autonome, déterministe et extensible, qui:
>
> * benchmarke régulièrement une liste de modèles LLM,
> * évalue leurs performances sur des tâches variées,
> * stocke l’historique complet des résultats,
> * calcule des rankings multi-dimensionnels,
> * permet de suivre l’évolution des modèles **dans le temps** (jour, semaine, mois, année),
> * tout en minimisant l’intervention humaine.

Nom de code :

* **SABE** – *Système Autonome de Benchmarking Évolutif*
* Alias : **Sentinelle LLM**

### 1.2 Problème adressé

* Les LLM **évoluent en continu** (nouvelles versions, mises à jour silencieuses, nouveaux modèles).
* Les benchmarks ponctuels deviennent **périmés en quelques semaines**.
* Les choix de modèles (production, produits, agents) sont souvent basés sur des impressions ou des tests ponctuels.

**SABE** répond à ça en devenant un **observatoire continu** :
un “LLM watcher” qui mesure **structurellement** et **historiquement** ce que valent les modèles — aujourd’hui, hier, il y a 6 mois.

### 1.3 Principes fondamentaux

| Principe               | Description                                                                    |
| ---------------------- | ------------------------------------------------------------------------------ |
| **Autonomie**          | Une fois configuré, le système tourne seul (scheduler, campagnes, boucles).    |
| **Déterminisme**       | Le **pipeline** d’exécution est toujours le même (mêmes étapes, même flow).    |
| **Séparation nette**   | Chaque concept est isolé (provider, modèle, tâches, scoring, ranking…).        |
| **Historisation**      | Toute exécution est historisée, traçable, rejouable.                           |
| **Extensibilité**      | V1 : OpenRouter. Mais data model et architecture prévoient d’autres providers. |
| **Simplicité d’usage** | Complexité interne, interaction externe minimale (consultation).               |

---

## 2. Périmètre & objectifs

### 2.1 In-scope v1 global

* Intégration avec **OpenRouter** comme provider unique.
* Gestion d’un **catalogue de modèles** (LLM) à tester.
* Gestion de **suites de benchmark** (ensembles de tâches / prompts).
* **Scheduling** de campagnes (hebdomadaire, mensuelle, ad-hoc).
* Exécution autonome de **runs** (campagnes d’évaluation).
* Stockage de toutes les **réponses brutes** + métriques (latence, tokens, coût).
* **Évaluation** des réponses (rule-based et LLM-as-judge conceptuellement prévu).
* Calcul et stockage de **rankings multi-dimensionnels** (par suite, par type, global).
* **Comparaisons temporelles** (semaine / semaine, mois / mois, etc.).
* Gestion d’**itérations** (versions de suites, méthodes d’évaluation, catalogues).
* Capacités de **reporting** (tableaux, exports, vues de base).

### 2.2 Out-of-scope initial (mais prévus dans le design)

* Multi-providers directs (OpenAI, Anthropic, modèles self-hosted) en v1.
* UI très avancée de création/édition de suites via interface no-code.
* Intégration “live” dans un produit (ex : AgentHub choisissant le meilleur modèle en temps réel) — ce système reste un **service d’observation**, pas un router de prod dans la V1.
* Benchmarks multimodaux complexes (image/audio) — support conceptuel, mais pas prioritaire.
* Optimisation automatique des coûts (choix dynamique par coût/perf en production).

### 2.3 Hypothèses et contraintes

* Le coût API mensuel est **contrôlé** :
  → SABE doit exposer les métriques nécessaires pour estimer et maîtriser ce coût (tokens, runs, etc.).
* Les données des suites de benchmark ne contiennent **pas de données client sensibles** (ou sont clairement taguées).
* SABE est pensé d’abord comme un **outil interne ERA**, extensible plus tard vers usage externe (clients, produits).

---

## 3. Glossaire (référence rapide)

| Terme                     | Définition synthétique                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------- |
| **Provider**              | Plateforme qui expose des modèles LLM via API (V1 : OpenRouter).                       |
| **Modèle / LLM**          | Modèle de langage (ex : `gpt-4.1`, `claude-3.5-sonnet`).                               |
| **Question / Tâche**      | Unité de test : prompt + consigne + attendus.                                          |
| **Suite de benchmark**    | Ensemble cohérent de tâches (ex : Reasoning général, Code).                            |
| **Campagne**              | Benchmark planifié : quelles suites, quels modèles, quelle fréquence.                  |
| **Run**                   | Une exécution réelle d’une campagne à une date donnée.                                 |
| **TaskExecution**         | Une tâche exécutée par un modèle donné dans un run donné.                              |
| **Évaluation**            | Transformation d’une réponse en score(s).                                              |
| **Dimension de score**    | Axe de notation (accuracy, style, reasoning, coût, etc.).                              |
| **Ranking**               | Classement ordonné des modèles selon un critère ou un ensemble de critères.            |
| **Snapshot**              | “Photo” d’un ranking à un instant donné (lié à un run).                                |
| **Itération**             | Version globale d’une configuration (suites, méthodes d’éval, modèles).                |
| **World State**           | Contexte du monde (news, événements) utilisé pour générer des questions contextuelles. |
| **Sentinelle LLM / SABE** | Le système lui-même.                                                                   |

---

## 4. Architecture conceptuelle (vue couches)

```text
┌──────────────────────────────────────────────────────────────┐
│ COUCHE PRÉSENTATION & CONSULTATION                          │
│ (Rapports, visualisations, exports, API read-only)          │
└──────────────────────────────────────────────────────────────┘
                             │
┌──────────────────────────────────────────────────────────────┐
│ COUCHE ANALYTIQUE                                            │
│ (Rankings, comparaisons, analyses temporelles, tendances)    │
└──────────────────────────────────────────────────────────────┘
                             │
┌──────────────────────────────────────────────────────────────┐
│ COUCHE ÉVALUATION                                            │
│ (Scoring rule-based, LLM-as-judge, normalisation)            │
└──────────────────────────────────────────────────────────────┘
                             │
┌──────────────────────────────────────────────────────────────┐
│ COUCHE EXÉCUTION                                             │
│ (Orchestration de campagnes, exécution des runs, états)      │
└──────────────────────────────────────────────────────────────┘
                             │
┌──────────────────────────────────────────────────────────────┐
│ COUCHE INTÉGRATION PROVIDERS                                 │
│ (Abstraction OpenRouter, gestion des appels API, quotas)     │
└──────────────────────────────────────────────────────────────┘
                             │
┌──────────────────────────────────────────────────────────────┐
│ COUCHE PERSISTANCE & MÉMOIRE                                 │
│ (Base de données, historique, snapshots, logs, itérations)   │
└──────────────────────────────────────────────────────────────┘
```

**Important :**

* On parle d’**architecture logique** (responsabilités), pas de techno.
* Chaque module fonctionnel s’inscrit dans une ou plusieurs couches.

---

## 5. Modèle de domaine (conceptuel)

### 5.1 Vue globale des blocs

1. **Providers & Modèles**
2. **Questions, Tâches & Suites**
3. **Campagnes & Runs**
4. **Exécutions de tâches & Réponses**
5. **Évaluations & Scores**
6. **Rankings & Snapshots**
7. **Temps & Itérations**
8. **World State (Contexte) – avancé**
9. **Configuration & Scheduling**
10. **Reporting & Export**

---

### 5.2 Providers & Modèles

#### Provider

* Identifiant interne
* Nom (ex : OpenRouter)
* Type (agrégateur, direct, self-hosted)
* URL/API base
* Méthode d’authentification
* Statut (actif / inactif)
* Paramètres de connexion (timeout, retries, etc.)

#### Modèle LLM

* Identifiant interne
* `provider_id`
* `provider_model_id` (ex : `"openrouter/anthropic/claude-3.5-sonnet"`)
* Nom d’affichage (ex : “Claude 3.5 Sonnet – reasoning”)
* Description courte
* **Tags** (reasoning, code, cheap, fast, open-source, etc.)
* Statut (actif / inactif / expérimental / deprecated)
* Métadonnées possibles :

  * Contexte max
  * Coût input/output par token
  * Date de release
  * Famille / version

#### Configuration de modèle pour benchmark

* Paramètres par défaut pour les runs :

  * temperature, top_p, max_tokens, etc.
* Possibilité de **presets** :

  * Profil “deterministic”, “creative”, “cheap”, etc. (Nice-to-have).

---

### 5.3 Questions, Tâches & Suites

#### Question / Tâche de benchmark

* ID
* Suite associée
* Contenu du prompt (entrée)
* Consigne (ce qu’on attend du modèle)
* Type de tâche :

  * Q&A simple, reasoning, code, classification, résumé, etc.
* Critères d’évaluation :

  * expected_answer (pour exact match)
  * regex / pattern
  * critères pour LLM judge (brief d’évaluation)
* Poids dans la suite (impact sur score global)
* Métadonnées :

  * Langue
  * Niveau de difficulté
  * Contexte supplémentaire éventuel

#### Type de question (catégorie)

* ID
* Nom (reasoning, math, code, etc.)
* Description
* Poids par défaut dans la construction de scores globaux (Nice-to-have).

#### Suite de benchmark

* ID
* Nom (ex : “Reasoning général V1”)
* Description
* Type global (reasoning, code, etc.)
* Liste ordonnée des tâches
* Version
* Statut (actif / archivé / deprecated)

#### Versioning

* Toute modification majeure (ajout/suppression de tâches, changements importants de prompt) → **nouvelle version de suite**.
* Les résultats sont **toujours liés à une version spécifique** de la suite.

---

### 5.4 Campagnes & Runs

#### Campagne de benchmark

* ID
* Nom (ex : “Weekly global benchmark”)
* Description
* Suites incluses
* Règle de sélection des modèles :

  * Liste explicite de modèles
  * Ou règle : “tous les modèles actifs avec tag X”
* Fréquence (hebdo, mensuel, manuel)
* Paramètres globaux (ex : limites de coût estimé)

#### Run

* ID
* `campaign_id`
* Date/heure de début, fin
* Statut (en cours, terminé, partiel, échec)
* `iteration_id`
* Snapshot de configuration utilisée (suites, modèles, params) à l’instant du run.

---

### 5.5 Exécutions de tâches & Réponses

#### TaskExecution

Représente une **exécution d’une tâche** par un modèle, dans un run donné.

* ID
* `run_id`
* `model_id`
* `task_id`
* Input effectif (prompt final réellement envoyé au LLM, incluant éventuel contexte global)
* Output brut (texte renvoyé par le modèle)
* Metadonnées :

  * Temps de réponse (ms)
  * Tokens input/output
  * Coût calculé
  * État (succès, timeout, erreur API, etc.)
  * Raw payload (JSON brut éventuel pour debug)

Cette entité est le “grain fin” minimal pour toute analyse.

---

### 5.6 Évaluations & Scores

#### Évaluation (score d’une TaskExecution)

* ID
* `task_execution_id`
* Type d’évaluateur :

  * `rule_based`, `llm_judge`, `custom`
* Modèle juge (si LLM-as-judge) : `evaluator_model_id`
* Dimension(s) évaluées :

  * accuracy, reasoning, style, safety, etc.
* Score brut (0–10, 0–100, ou autre)
* Score normalisé (pour comparaisons)
* Justification (texte – souvent pour LLM-judge)
* Détail des critères (JSON)

#### Dimensions de score

Exemples :

* **Exactitude / factualité**
* **Raisonnement / logique**
* **Qualité de code** (compilabilité, lisibilité)
* **Concision / clarté**
* **Respect des instructions**
* **Sécurité / alignement**
* **Temps de réponse**
* **Coût**

Le système doit pouvoir **ajouter de nouvelles dimensions** sans casser le reste.

---

### 5.7 Rankings & Snapshots

#### RankingSnapshot

* ID
* `run_id`
* Scope / type :

  * global (toutes suites)
  * par suite
  * par type de question
  * par dimension spécifique
* Contexte (JSON) :

  * filtres appliqués (ex : modèles tag “production-ready”, suite “Reasoning v2”, dimension “accuracy”)
* Date de création

#### ModelRankingEntry

* ID
* `ranking_snapshot_id`
* `model_id`
* Score agrégé (selon le scope)
* Position (1er, 2e, …)
* Delta vs snapshot précédent (position / score) – optionnel
* Métadonnées (taille d’échantillon, variance, etc.)

**Idée clé :**
Le ranking n’est pas qu’un tableau généré à la volée, c’est une **entité persistée** en propre, avec son contexte (date, conditions, itération).

---

### 5.8 Temps & Itérations

#### Itération

Représente une **version du monde du benchmark**.

* ID
* Nom / code (ex : `ITER-2025-01`)
* Description
* Date de début, date de fin (optionnel)
* Contenu :

  * Version(s) des suites actives
  * Méthode(s) d’évaluation (prompts des judges, type de scoring)
  * Règles de sélection de modèles
* Changelog (texte explicatif)

Tout run est lié à **exactement une itération**.

---

### 5.9 World State & Contexte (avancé)

Concept avancé, **Nice-to-have / Future**.

* Snapshot du “monde” à un instant T :

  * événements majeurs (finance, tech, géopolitique…)
  * versions majeures de librairies, frameworks, etc.
* Utilisation :

  * Générer des **questions dynamiques** basées sur l’actualité.
  * Tester la **fraîcheur** des modèles.

---

### 5.10 Configuration & Scheduling

#### BenchmarkProfile (profil de campagne)

* Nom, description
* Suites de benchmark
* Modèles cibles ou règle de sélection
* Méthode d’évaluation par défaut
* Paramètres globaux (stop conditions, etc.)

#### Schedule

* `profile_id`
* Mode de planification (cron-like)
* Actif / inactif
* Dernière exécution, prochaine exécution prévue

---

### 5.11 Reporting & Export

* Types de rapports :

  * Rapport d’un run
  * Rapport comparatif (run N vs N-1)
  * Rapport d’évolution d’un modèle
  * Rapport par suite / par dimension
* Formats :

  * V1 : JSON, CSV, vue tabulaire (UI basique / API).
  * FUTURE : PDF, dashboards BI, etc.

---

## 6. Modules fonctionnels & exigences

Pour chaque module : rôle, responsabilités, **MoSCoW**.

---

### 6.1 Provider Manager

**Rôle :** gérer les providers (V1: OpenRouter) et exposer une interface unique au reste du système.

**Responsabilités :**

* Stocker et charger la config provider.
* Encapsuler les appels API (prompt → réponse).
* Gérer les erreurs, timeouts, retries.
* Exposer un format interne homogène de réponse.

**Priorité :**

* **MANDATORY :**

  * Connexion stable à OpenRouter.
  * Gestion basique des erreurs, timeouts.
* **MVP :**

  * Retry simple, logging cohérent.
  * Premier niveau de rate limit.
* **NICE-TO-HAVE :**

  * Health-check provider, stats d’erreurs.
* **FUTURE :**

  * Multi-providers (OpenAI direct, Anthropic direct, self-hosted).
  * Fallback automatique entre providers.

---

### 6.2 Model Registry

**Rôle :** tenir le catalogue des modèles benchmarkés.

**Responsabilités :**

* CRUD de modèles.
* Activation / désactivation.
* Gestion de tags (reasoning, code, cheap, etc.).
* Configuration de paramètres par défaut.

**Priorité :**

* **MANDATORY :**

  * CRUD simple.
  * Statut actif/inactif.
  * Liaison provider ↔ modèle.
* **MVP :**

  * Métadonnées de base (contexte, coût, release date).
  * Tags simples.
* **NICE-TO-HAVE :**

  * Découverte automatique de nouveaux modèles via OpenRouter.
  * Suggestions (nouveaux modèles trouvés, etc.).

---

### 6.3 Question Bank & Benchmark Suites

**Rôle :** gérer le “contenu” des benchmarks.

**Responsabilités :**

* CRUD de tâches.
* Gestion des suites (composition, ordre).
* Types de tâches / catégories.
* Versioning de suites.

**Priorité :**

* **MANDATORY :**

  * CRUD des questions et suites.
  * Liaison question → suite.
  * Version de suite.
* **MVP :**

  * Types de tâches, quelques métadonnées.
  * Poids des tâches dans le scoring.
* **NICE-TO-HAVE :**

  * Import/export de suites.
  * Générateur de tâches via LLM.
  * Validation semi-automatique des tâches.

---

### 6.4 Benchmark Executor (Orchestration des runs)

**Rôle :** exécuter des campagnes de benchmark de bout en bout.

**Responsabilités :**

* Charger la configuration (campagne, suites, modèles, itération).
* Générer la liste des combinaisons modèle × tâche.
* Appeler les LLM via Provider Manager.
* Stocker les TaskExecutions.

**Priorité :**

* **MANDATORY :**

  * Exécution manuelle complète d’une campagne.
  * Persistance des réponses et métadonnées.
* **MVP :**

  * Gestion des erreurs simples, marquage des échecs.
  * Logging détaillé d’un run.
* **NICE-TO-HAVE :**

  * Parallélisation contrôlée.
  * Reprise d’un run interrompu.

---

### 6.5 Evaluator (Scoring Engine)

**Rôle :** transformer les réponses en scores.

**Responsabilités :**

* Appliquer des règles déterministes (exact match, regex, etc.).
* Optionnel : appeler un “LLM judge” pour scoring qualitatif.
* Normaliser les scores sur des échelles cohérentes.
* Persister les évaluations.

**Priorité :**

* **MANDATORY :**

  * Évaluation simple rule-based sur quelques tâches (pour MVP).
  * Modèle conceptuel pour multi-dimensions.
* **MVP :**

  * Première intégration d’un LLM-as-judge sur un sous-ensemble de tâches.
  * Normalisation simple (0–100).
* **NICE-TO-HAVE :**

  * Multi-juges (moyenne, consensus).
  * Calibration du juge.
  * Métriques avancées (BLEU, ROUGE, tests unitaires pour code).

---

### 6.6 Ranking Engine

**Rôle :** agrégation des scores et construction des rankings + snapshots.

**Responsabilités :**

* Calcul des scores agrégés par modèle / suite / dimension.
* Génération des snapshots de ranking.
* Comparaison avec snapshots précédents (delta).

**Priorité :**

* **MANDATORY :**

  * Ranking global par run (score moyen).
  * Persistance des snapshots.
* **MVP :**

  * Rankings par suite.
  * Deltas de score et de position vs run précédent.
* **NICE-TO-HAVE :**

  * Rankings par type de tâche, par dimension (reasoning, code).
  * Elo-like ranking (compétition directe).

---

### 6.7 Temporal Analyzer

**Rôle :** analyser l’évolution des modèles dans le temps.

**Responsabilités :**

* Construire des séries temporelles de scores / positions.
* Comparer semaine / semaine, mois / mois.
* Détecter les fortes variations.

**Priorité :**

* **MANDATORY :**

  * Historique simple des scores d’un modèle sur les derniers runs.
* **MVP :**

  * Comparaison run N vs N-1.
  * Delta (absolu, relatif).
* **NICE-TO-HAVE :**

  * Détection d’anomalies (chute brutale).
  * Tendances (régression linéaire, volatilité).

---

### 6.8 Scheduler

**Rôle :** déclencher automatiquement les campagnes.

**Responsabilités :**

* Lire les profils de benchmark et leurs schedules.
* Déclencher les runs au bon moment.
* Enregistrer les statuts (succès, erreurs).

**Priorité :**

* **MANDATORY :**

  * Planification simple (hebdo).
  * Possibilité de lancer aussi manuellement.
* **MVP :**

  * Multi-campagnes avec fréquences différentes.
* **NICE-TO-HAVE :**

  * Conditions d’arrêt (cost cap, time cap).
  * Interface pour pause / reprise.

---

### 6.9 Memory Manager & Iterations

**Rôle :** gérer la mémoire “stratégique” du système (itérations).

**Responsabilités :**

* Créer / clôturer des itérations.
* Capturer la configuration associée à chaque itération.
* Permettre de rejouer des runs “comme avant”.

**Priorité :**

* **MANDATORY :**

  * Champ `iteration_id` pour les runs.
  * Minimal changelog (texte libre).
* **MVP :**

  * Structure claire pour documenter les changements de suites, méthodes de scoring.
  * Historique consultable.
* **NICE-TO-HAVE :**

  * UI “release notes” par itération.

---

### 6.10 Reporter & Exports

**Rôle :** exposer les résultats aux humains ou à d’autres systèmes.

**Responsabilités :**

* Générer rapports de run.
* Générer vues par modèle, par suite, par période.
* Export JSON / CSV.

**Priorité :**

* **MANDATORY :**

  * Export simple des données brutes / évaluées.
  * Quelques rapports textuels (tableaux).
* **MVP :**

  * Vues essentielles (fiche modèle, fiche suite, run détaillé).
* **NICE-TO-HAVE :**

  * Graphiques, dashboards, intégration BI.
  * PDF ou rapports “board-ready”.

---

## 7. Flux principaux

### 7.1 Flux principal : exécution complète d’un benchmark

1. **Déclencheur**

   * Scheduler (planifié) ou déclenchement manuel.

2. **Initialisation**

   * Charger la campagne concernée.
   * Récupérer la liste des modèles actifs ciblés.
   * Charger les suites et leurs tâches (avec versions).
   * Déterminer l’`iteration_id`.
   * Créer un enregistrement de **Run**.

3. **Exécution des tâches**

   * Pour chaque modèle :

     * Pour chaque tâche de chaque suite :

       * Construire le prompt effectif.
       * Appeler Provider Manager (OpenRouter).
       * Recevoir la réponse.
       * Créer et persister une **TaskExecution** (réponse + métadonnées).
       * Gérer erreurs (timeout, API down → marquer échec).

4. **Évaluation**

   * Pour chaque TaskExecution réussie :

     * Appliquer les règles d’évaluation (rule-based, LLM-judge).
     * Créer les **Évaluations** (dimension, score, justification).

5. **Agrégation & Ranking**

   * Agréger les scores par modèle / suite / dimension.
   * Calculer les scores globaux.
   * Générer un **RankingSnapshot** (global, par suite, etc.).
   * Calculer les deltas avec snapshot précédent, si existant.

6. **Analyse temporelle**

   * Mettre à jour les séries temporelles.
   * Calculer quelques métriques (delta, % de variation).

7. **Finalisation**

   * Marquer le Run comme complété (ou partiel / échec).
   * Générer le rapport associé.
   * Optionnel : déclencher des notifications.

---

### 7.2 Gestion des erreurs (principes)

| Type d’erreur                | Comportement attendu                                    |
| ---------------------------- | ------------------------------------------------------- |
| Timeout API / réseau         | Retry limité, puis marquer TaskExecution en échec.      |
| Rate limit provider          | Pause courte + retry, sinon partial fail.               |
| Auth provider invalide       | Stop run, alerter (erreur critique).                    |
| Réponse illisible / invalide | Marquer comme non-évaluable, log, continuer le reste.   |
| Erreur côté LLM-judge        | Marquer la tâche comme “non évaluée”, continuer le run. |
| Erreur système interne       | Stop, log, garder ce qui est déjà persistant.           |

---

### 7.3 Gestion des itérations

* Nouvelle itération ouverte lorsque :

  * On change significativement les suites (contenu, prompts).
  * On change la méthode d’évaluation (nouveau judge, nouvelle échelle).
* Chaque run est explicitement rattaché à l’itération active.
* On documente l’itération (description + changelog).

---

### 7.4 Flux avancé : génération de questions “World State” (Future)

* Récupérer un snapshot d’actualité (news, versions de tech).
* Générer dynamiquement des tâches :

  * “Que s’est-il passé sur les marchés tech cette semaine ?”
* Tester la capacité des LLM à refléter l’état du monde.

Ce flux est **futur / avancé**, mais prévu dans le modèle.

---

## 8. Dimensions analytiques & métriques

### 8.1 Axes principaux

1. **Performance qualitative** (accuracy, reasoning, style...)
2. **Vitesse** (latence moyenne / médiane)
3. **Coût** (tokens → $)
4. **Stabilité** (variance des scores dans le temps)
5. **Évolution** (progression ou régression)

### 8.2 Comparaisons temporelles

* **Séquentiel :**

  * Run N vs Run N-1
  * Semaine S vs S-1
  * Mois M vs M-1
* **À date fixe :**

  * Semaine actuelle vs même semaine l’an dernier.
* **Sur plage :**

  * Moyenne des 3 derniers mois vs 3 mois précédents.

Métriques utiles :

* Delta absolu de score.
* Delta relatif (%).
* Changement de position dans le ranking.
* Tendance (slope sur N points).
* Volatilité (écart-type).

---

## 9. Roadmap & phases projet (SOW haut niveau)

### 9.1 Phase 0 – Concept & cadrage

**Objectifs :**

* Valider et figer ce document.
* Choisir les premières suites et tâches (contenu concret de benchmark).
* Définir un budget API cible pour le MVP.

**Livrables :**

* `docs/SABE_CONCEPT.md` (ce doc) validé.
* `docs/INITIAL_SUITES.md` (liste de suites & tâches v1).

---

### 9.2 Phase 1 – MVP “Heartbeat”

**But :** faire vivre un premier “cœur battant” du système.

**Fonctionnalités cible :**

* Intégration OpenRouter (Provider Manager v1).
* Model Registry simple avec quelques modèles.
* 1 à 2 suites de benchmark (10–30 tâches).
* 1 campagne hebdomadaire.
* Exécution complète d’un run, stockage :

  * réponses brutes
  * métadonnées (latence, tokens)
* Évaluation simple (rule-based) sur un sous-ensemble de tâches.
* Ranking global simple par run.
* Export JSON/CSV des résultats.

**Critères de succès :**

* Un run hebdo peut tourner **sans intervention**.
* On peut montrer à quelqu’un :

  * “Voici les 3 meilleurs modèles sur notre suite de test, cette semaine.”
  * “Voici la même info pour la semaine dernière.”

---

### 9.3 Phase 2 – Historique, itérations & multi-suites

**Objectifs :**

* Solidifier la mémoire et les comparaisons temporelles.

**Fonctionnalités :**

* Support propre des **itérations** (versionnage des suites, méthode d’évaluation).
* Plusieurs suites (Reasoning, Code, etc.).
* Rankings par suite.
* Première version du **Temporal Analyzer** (comparaison run N vs run N-1).
* Vues de base “historique d’un modèle”.

**Critères de succès :**

* Capacité à répondre :

  * “Ce modèle est-il meilleur ou pire qu’il y a 4 semaines sur le reasoning ?”
  * “Quelle suite a le plus évolué en scores ?”

---

### 9.4 Phase 3 – LLM-as-Judge & multi-dimensions

**Objectifs :**

* Rendre les évaluations plus riches et plus proches de l’usage réel.

**Fonctionnalités :**

* Intégration d’un modèle “judge” (via OpenRouter).
* Définition de quelques dimensions (accuracy, reasoning, style).
* Scoring multi-dimensionnel sur certaines suites.
* Rankings par dimension.

**Critères de succès :**

* Capacités à dire :

  * “En reasoning pur, c’est ce modèle qui est meilleur.”
  * “Pour le style, un autre modèle est devant.”

---

### 9.5 Phase 4 – Extensibilité & UI / Observabilité

**Objectifs :**

* Industrialiser et rendre le système agréable à consulter.

**Fonctionnalités :**

* UI plus complète (dashboards, graphes).
* Alertes (modèle qui s’effondre, nouveau modèle très performant).
* Intégration multi-providers si besoin (OpenAI direct, etc.).
* Reporting avancé sur les coûts.

---

## 10. Considérations transversales

### 10.1 Sécurité & confidentialité

* Stockage sécurisé des API keys (secrets).
* Pas de log des clés ou infos sensibles.
* Taguer les suites qui utiliseraient potentiellement des données sensibles.
* Contrôler qui a accès aux résultats et à la config.

### 10.2 Performance & scalabilité

* Respecter les rate limits OpenRouter.
* Eviter les requêtes inutiles (pas de re-benchmark si identique à 24h près, par ex. → future optimisation).
* Prévoir un modèle de données scalable (historiques volumineux).

### 10.3 Observabilité

* Logging structuré (par run, par TaskExecution).
* Métriques :

  * nombre de runs, taux d’échec, latence moyenne, coût approximatif.
* Alerte minimaliste en cas d’échec complet de run.

### 10.4 Gouvernance & audit

* Historiser les changements de :

  * suites, tâches
  * méthodes d’évaluation
  * catalogues de modèles
* Avoir un **audit log** minimal pour suivre qui a changé quoi.

---

## 11. Risques & limites

* **Dépendance à un provider tiers** (OpenRouter) :
  → Prévu conceptuellement de pouvoir ouvrir à d’autres providers.
* **Biais / subjectivité des LLM-judges** :
  → Besoin de calibration, éventuellement plusieurs juges.
* **Coût API** :
  → Besoin de monitoring et de limites (nombre de runs, taille des suites).
* **Évolution du paysage LLM** :
  → SABE doit accepter qu’il faudra rajouter de nouveaux types de tâches / suites au fil du temps.

---

## 12. Questions ouvertes

À éclaircir/figer avant ou pendant la Phase 0 :

1. **Base de données cible ?** (Postgres, autre) — impact sur implémentation, pas sur le modèle.
2. **Langage / stack principale ?** (pour orchestrer les runs).
3. **Fréquence exacte des runs** : hebdo + mensuel ? hebdo seulement au début ?
4. **Nombre de modèles à suivre au lancement ?** (5 ? 10 ? 20 ?).
5. **Nombre de tâches par suite v1 ?** (plutôt 10, 50, 100 ?).
6. **Premier modèle “LLM judge” envisagé ?** (un modèle premium, un open, mix ?).
7. **Volume de budget API mensuel max pour le MVP ?**
8. **Niveau d’effort sur l’UI** pour la V1 (tableaux simples vs petit dashboard).

---

Si tu veux, à partir de ce document, je peux :

* te le **découper en plusieurs fichiers** prêts pour ton repo (`00_VISION`, `01_GLOSSAIRE`, etc.), ou
* zoomer sur **un module précis** (ex : Ranking Engine, Memory & Iterations) et te faire le doc ultra détaillé juste pour celui-là.
