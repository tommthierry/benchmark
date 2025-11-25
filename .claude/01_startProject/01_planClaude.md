# Document de Conception Maître
## Système Autonome de Benchmarking Évolutif (SABE)
### "La Sentinelle des LLM"

---

**Version:** 1.0
**Date:** 24 novembre 2025
**Statut:** Document Fondateur - Bible du Projet
**Auteur:** Tom @ Groupe Conseil ERA

---

## Table des Matières

1. [Vision et Philosophie](#1-vision-et-philosophie)
2. [Glossaire et Concepts Fondamentaux](#2-glossaire-et-concepts-fondamentaux)
3. [Périmètre et Contraintes](#3-périmètre-et-contraintes)
4. [Architecture Conceptuelle](#4-architecture-conceptuelle)
5. [Domaine et Entités](#5-domaine-et-entités)
6. [Spécifications Fonctionnelles par Module](#6-spécifications-fonctionnelles-par-module)
7. [Flux et Comportements du Système](#7-flux-et-comportements-du-système)
8. [Dimensions Temporelles et Mémoire](#8-dimensions-temporelles-et-mémoire)
9. [Modèle de Données Conceptuel](#9-modèle-de-données-conceptuel)
10. [Priorisation MoSCoW](#10-priorisation-moscow)
11. [Roadmap par Phases](#11-roadmap-par-phases)
12. [Considérations Transversales](#12-considérations-transversales)
13. [Questions Ouvertes et Décisions à Prendre](#13-questions-ouvertes-et-décisions-à-prendre)
14. [Annexes](#14-annexes)

---

## 1. Vision et Philosophie

### 1.1 Énoncé de Vision

> Construire un **observatoire autonome et perpétuel de l'intelligence artificielle** : un système qui agit comme un auditeur systématique des LLM, mesurant non seulement si un modèle fonctionne, mais sa "texture", son évolution dans le temps, et sa réaction face à des contextes changeants. Le système accumule de la donnée historique pour visualiser des tendances et permettre des décisions éclairées sur le choix des modèles.

### 1.2 Objectifs Stratégiques

| Objectif | Description |
|----------|-------------|
| **Comparaison systématique** | Évaluer automatiquement et régulièrement les performances de multiples modèles sur des jeux de questions définis |
| **Évolution temporelle** | Mesurer comment un même modèle évolue dans le temps (amélioration, dégradation, mise à jour silencieuse) |
| **Mémoire structurée** | Garder trace de tous les runs, rankings, itérations et conditions de test |
| **Autonomie complète** | Fonctionner sans intervention humaine une fois configuré |
| **Fondation décisionnelle** | Servir de base pour choisir automatiquement le bon modèle par use case dans des produits futurs (AgentHub, etc.) |

### 1.3 Principes Fondamentaux

#### Autonomie
Le système fonctionne comme une entité indépendante. Une fois configuré, il exécute ses benchmarks, calcule ses rankings, et met à jour son historique sans nécessiter d'intervention humaine.

#### Déterminisme du Pipeline
Bien que les LLM ne soient pas déterministes par nature, le pipeline du système l'est. Même séquence d'étapes, même réaction aux mêmes entrées, même comportement reproductible.

#### Séparation des Préoccupations
Chaque concept du système est isolé et indépendant :
- La connexion aux providers = son propre module
- Le système de ranking = son propre module
- La gestion temporelle = son propre module
- Chaque type de question = son propre concept

#### Approche Incrémentale
Le système est pensé et construit de manière step-by-step :
- Chaque phase clairement délimitée
- Chaque étape indépendamment testable
- Chaque feature isolable
- Chaque bout de code encapsulé

#### Reproductibilité
Toute exécution de benchmark doit être :
- **Traçable** : quand, avec quels paramètres, dans quel contexte
- **Reproductible** : même entrée = même comportement système
- **Comparable** : entre différentes dates, modèles, versions

### 1.4 Caractéristiques Clés du Système

| Caractéristique | Manifestation |
|-----------------|---------------|
| **Simplicité d'interaction** | Peu d'interactions requises malgré la complexité interne |
| **Profondeur architecturale** | Architecture profonde avec de nombreux concepts imbriqués |
| **Extensibilité native** | Facilité d'ajout de nouveaux modèles, providers, types de tests |
| **Persistance totale** | Aucune donnée n'est perdue, tout est historisé |

---

## 2. Glossaire et Concepts Fondamentaux

### 2.1 Concepts Liés aux Providers

| Terme | Définition |
|-------|------------|
| **Provider** | Service externe fournissant l'accès à des modèles LLM via API. V1 : OpenRouter |
| **Provider Gateway** | Interface d'abstraction permettant l'agnosticisme du fournisseur |
| **Connexion API** | Mécanisme technique de communication avec un provider (credentials, endpoints, retry policy) |

### 2.2 Concepts Liés aux Modèles

| Terme | Définition |
|-------|------------|
| **Modèle/LLM** | Un Large Language Model spécifique accessible via un provider (ex: `gpt-4-0613`, `claude-3.5-sonnet`) |
| **Métadonnées Statiques** | Informations fixes : fournisseur, date de sortie, taille, coût par token |
| **Métadonnées Dynamiques** | Tags et labels attribués par le système (ex: "Coding Expert", "Fast Inference", "Deprecated") |
| **Configuration de Modèle** | Paramètres d'appel : temperature, max_tokens, top_p, etc. |

### 2.3 Concepts Liés aux Tests

| Terme | Définition |
|-------|------------|
| **Question de Benchmark** | Un prompt standardisé utilisé pour évaluer les modèles |
| **Type de Question** | Catégorisation par nature : raisonnement, code, créativité, factualité, etc. |
| **Suite de Questions** | Ensemble cohérent de questions formant un benchmark complet |
| **Campagne de Benchmark** | Configuration d'exécution : quelles suites, quels modèles, quelle fréquence |

### 2.4 Concepts Liés aux Rankings

| Terme | Définition |
|-------|------------|
| **Ranking** | Classement ordonné de modèles selon des critères spécifiques. **Entité complexe avec sa propre table** |
| **Score** | Valeur numérique représentant la performance sur un critère |
| **Dimension de Ranking** | Axe d'évaluation : par type de question, par date, par itération, comparatif |
| **Position** | Place d'un modèle dans un classement donné, avec delta vs précédent |

### 2.5 Concepts Temporels

| Terme | Définition |
|-------|------------|
| **Run/Exécution** | Une instance d'exécution complète du système de benchmark |
| **Itération** | Version globale d'une expérience (changement de dataset, prompt, méthode d'évaluation) |
| **Snapshot** | Capture d'état du système à un instant T : rankings, scores, configuration |
| **Période de Comparaison** | Fenêtre temporelle : WoW (Week-over-Week), MoM (Month-over-Month), YoY (Year-over-Year) |

### 2.6 Concepts d'Évaluation

| Terme | Définition |
|-------|------------|
| **LLM-as-Judge** | Utilisation d'un LLM puissant pour noter les réponses d'autres LLM |
| **Évaluation Automatique** | Évaluation programmatique : exact match, regex, tests unitaires, métriques NLP |
| **Résultat d'Évaluation** | Score obtenu + justification + méthode utilisée |

### 2.7 Concepts de Mémoire

| Terme | Définition |
|-------|------------|
| **Historique** | Archive complète de tous les résultats passés |
| **Mémoire du Système** | État persistant permettant la continuité entre exécutions |
| **Context Snapshot** | État du monde au moment du test (actualités, événements) pour analyse contextuelle |

---

## 3. Périmètre et Contraintes

### 3.1 Périmètre V1 (In-Scope)

| Domaine | Inclus |
|---------|--------|
| **Providers** | Intégration API avec OpenRouter uniquement |
| **Modèles** | Gestion d'un catalogue de modèles à benchmarker avec labels personnalisés |
| **Benchmarks** | Définition et stockage de suites de benchmark (tâches, prompts, consignes) |
| **Orchestration** | Runs planifiés automatiques (hebdomadaires, mensuels) |
| **Stockage** | Toutes les réponses brutes + métadonnées complètes |
| **Évaluation** | Règles simples + LLM-as-Judge |
| **Rankings** | Multi-dimensions avec snapshots horodatés |
| **Temporalité** | Comparaisons semaine/semaine, mois/mois |
| **Mémoire** | Itérations, config versioning, historique complet |

### 3.2 Hors Périmètre V1 (Out-of-Scope)

| Domaine | Exclu pour V1 |
|---------|---------------|
| **UI avancée** | Interface graphique élaborée d'édition des benchmarks |
| **Auto-sélection** | Choix automatique de modèles en prod basé sur les résultats |
| **Optimisation coûts** | Choix modèle par ratio coût/performance automatique |
| **Multi-média** | Benchmarks image, audio, vidéo |
| **Multi-providers** | OpenAI direct, Anthropic direct, LLM locaux |

### 3.3 Contraintes Techniques

| Contrainte | Description |
|------------|-------------|
| **Provider unique** | OpenRouter en V1 (mais architecture extensible) |
| **Lecture prioritaire** | V1 orientée consultation des résultats, pas édition complexe |
| **Coûts API** | Budget à définir pour les appels LLM (tests + juges) |
| **Latence acceptable** | Les benchmarks peuvent tourner sur plusieurs heures si nécessaire |

### 3.4 Contraintes Business

| Contrainte | Description |
|------------|-------------|
| **Autonomie** | Minimum d'interventions humaines au quotidien |
| **Auditabilité** | Traçabilité complète des décisions et résultats |
| **Confidentialité** | Flag pour indiquer si un benchmark utilise des données sensibles |

---

## 4. Architecture Conceptuelle

### 4.1 Vue en Couches

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       COUCHE PRÉSENTATION                               │
│         Rapports, Visualisations, Exports, API de consultation          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                       COUCHE ANALYTIQUE                                 │
│           Rankings, Comparaisons, Agrégations, Tendances                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                       COUCHE ÉVALUATION                                 │
│         LLM-as-Judge, Évaluation Auto, Scoring, Normalisation           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                       COUCHE EXÉCUTION                                  │
│           Orchestration, Séquencement, Gestion des itérations           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                       COUCHE INTÉGRATION                                │
│        Abstraction Providers, Connexions API, Gestion credentials       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                       COUCHE PERSISTANCE                                │
│            Base de données, Historique, Snapshots, Cache                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Modules Fonctionnels

| Module | Responsabilité | Entrées | Sorties |
|--------|----------------|---------|---------|
| **Provider Manager** | Gestion des connexions aux providers | Config provider, credentials | Connexion active, réponses normalisées |
| **Model Registry** | Catalogue des modèles disponibles | Définitions, métadonnées | Liste des modèles actifs, configurations |
| **Question Bank** | Gestion des questions de benchmark | Questions, catégorisations | Suites de questions, prompts formatés |
| **Benchmark Executor** | Orchestration des exécutions | Profil, modèles, questions | Réponses brutes, métadonnées d'exécution |
| **Evaluator** | Évaluation des réponses | Réponses, critères, modèle juge | Scores, justifications |
| **Ranking Engine** | Calcul et gestion des rankings | Scores, critères de ranking | Classements multi-dimensionnels |
| **Temporal Analyzer** | Analyses temporelles et comparaisons | Historique, périodes | Tendances, évolutions, deltas |
| **Reporter** | Génération des rapports | Données analysées, format | Rapports formatés |
| **Scheduler** | Planification des exécutions | Configuration planning | Déclenchement des benchmarks |
| **Memory Manager** | Gestion de la persistance | Données à persister | Données historiques, état système |

### 4.3 Interactions entre Modules

```
                    ┌──────────────┐
                    │  Scheduler   │
                    └──────┬───────┘
                           │ déclenche
                           ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│Model Registry│◄───│  Benchmark   │───►│Question Bank │
└──────────────┘    │   Executor   │    └──────────────┘
                    └──────┬───────┘
                           │ appelle
                           ▼
                    ┌──────────────┐
                    │   Provider   │
                    │   Manager    │
                    └──────┬───────┘
                           │ réponses
                           ▼
                    ┌──────────────┐
                    │  Evaluator   │
                    └──────┬───────┘
                           │ scores
                           ▼
                    ┌──────────────┐    ┌──────────────┐
                    │   Ranking    │───►│   Temporal   │
                    │    Engine    │    │   Analyzer   │
                    └──────┬───────┘    └──────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │ Memory   │ │ Reporter │ │ Database │
       │ Manager  │ │          │ │          │
       └──────────┘ └──────────┘ └──────────┘
```

---

## 5. Domaine et Entités

### 5.1 Provider Gateway

**Rôle :** Interface d'abstraction pour l'agnosticisme du fournisseur.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| name | String | Nom du provider (OpenRouter, OpenAI, etc.) |
| api_base_url | String | URL de base de l'API |
| auth_type | Enum | Type d'authentification (API Key, OAuth, etc.) |
| status | Enum | actif / inactif |
| rate_limits | JSON | Limites de requêtes |
| config | JSON | Configuration spécifique |
| created_at | DateTime | Date d'ajout |

### 5.2 Modèle LLM

**Rôle :** Représentation d'un modèle de langage. C'est un objet vivant qui évolue.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique interne |
| provider_id | FK | Référence au provider |
| provider_model_id | String | ID technique chez le provider (ex: `anthropic/claude-3-opus`) |
| display_name | String | Nom d'affichage |
| label | String | Label personnalisé défini par l'utilisateur |
| description | Text | Description courte |
| status | Enum | actif / inactif / expérimental / deprecated |
| context_size | Integer | Taille du contexte en tokens |
| cost_input_per_token | Decimal | Coût par token en entrée |
| cost_output_per_token | Decimal | Coût par token en sortie |
| release_date | Date | Date de sortie officielle |
| tags | Array[String] | Étiquettes (reasoning, code, fast, cheap, etc.) |
| default_config | JSON | Paramètres par défaut (temperature, etc.) |
| metadata | JSON | Autres métadonnées |
| created_at | DateTime | Date d'ajout au système |

### 5.3 Question de Benchmark

**Rôle :** Un stimulus standardisé envoyé aux modèles.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| content | Text | Contenu du prompt |
| question_type_id | FK | Référence au type de question |
| difficulty | Enum | Estimation de difficulté (easy/medium/hard/expert) |
| expected_answer | Text | Réponse attendue (si applicable) |
| evaluation_criteria | JSON | Critères d'évaluation spécifiques |
| evaluation_method | Enum | exact_match / regex / llm_judge / custom |
| weight | Decimal | Poids dans le score global |
| version | Integer | Numéro de version |
| status | Enum | active / archived |
| language | String | Langue de la question |
| context | Text | Contexte additionnel si nécessaire |
| created_at | DateTime | Date de création |

### 5.4 Type de Question

**Rôle :** Catégorisation des questions par nature.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| name | String | Nom (Reasoning, Code, Creativity, etc.) |
| description | Text | Description |
| weight | Decimal | Pondération dans le score global |
| evaluation_defaults | JSON | Méthodes d'évaluation par défaut |
| created_at | DateTime | Date de création |

**Types Prévus :**
- Raisonnement logique
- Mathématiques
- Créativité
- Factualité
- Suivi d'instructions
- Coding
- Analyse de texte
- Multi-étapes
- Traduction
- Résumé

### 5.5 Suite de Questions

**Rôle :** Ensemble cohérent de questions formant un benchmark complet.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| name | String | Nom de la suite |
| description | Text | Description |
| type | String | Type global (generaliste, code, reasoning) |
| version | String | Version (v1, v2, etc.) |
| status | Enum | active / deprecated |
| objective | Text | Objectif de la suite |
| created_at | DateTime | Date de création |

### 5.6 Campagne de Benchmark

**Rôle :** Configuration d'une série de benchmarks planifiés.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| name | String | Nom (Weekly Global, Monthly Deep, etc.) |
| description | Text | Description |
| frequency | Enum | weekly / monthly / quarterly / manual |
| cron_expression | String | Expression cron pour planification |
| suite_ids | Array[UUID] | Suites incluses |
| model_selection_rule | JSON | Règle de sélection des modèles |
| is_active | Boolean | Campagne active ou non |
| last_run_at | DateTime | Dernière exécution |
| next_run_at | DateTime | Prochaine exécution |
| created_at | DateTime | Date de création |

### 5.7 Exécution de Benchmark (Run)

**Rôle :** Une instance d'exécution complète du système.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| campaign_id | FK | Référence à la campagne |
| iteration_id | FK | Référence à l'itération |
| iteration_number | Integer | Numéro séquentiel du run |
| started_at | DateTime | Date/heure de début |
| completed_at | DateTime | Date/heure de fin |
| status | Enum | pending / running / completed / failed / partial |
| models_count | Integer | Nombre de modèles testés |
| questions_count | Integer | Nombre de questions posées |
| config_snapshot | JSON | Snapshot de la configuration au moment du run |
| summary | JSON | Résumé des résultats agrégés |
| error_log | Text | Log des erreurs si applicable |
| created_at | DateTime | Date de création |

### 5.8 Résultat de Benchmark

**Rôle :** Réponse brute d'un modèle à une question.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| execution_id | FK | Référence au run |
| model_id | FK | Référence au modèle |
| question_id | FK | Référence à la question |
| input_effective | Text | Prompt final envoyé |
| response_content | Text | Réponse brute du modèle |
| response_time_ms | Integer | Temps de réponse en millisecondes |
| tokens_input | Integer | Tokens en entrée |
| tokens_output | Integer | Tokens en sortie |
| cost | Decimal | Coût de l'appel |
| status | Enum | success / error / timeout |
| error_message | Text | Message d'erreur si applicable |
| raw_response | JSON | Réponse brute complète de l'API |
| created_at | DateTime | Date de création |

### 5.9 Évaluation

**Rôle :** Notation d'une réponse selon des critères définis.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| result_id | FK | Référence au résultat de benchmark |
| evaluator_type | Enum | rule_based / llm_judge / custom |
| evaluator_model_id | FK | Modèle juge (si LLM-as-Judge) |
| dimension | String | Dimension évaluée (accuracy, style, etc.) |
| score | Decimal | Score obtenu |
| max_score | Decimal | Score maximum possible |
| normalized_score | Decimal | Score normalisé (0-100) |
| justification | Text | Justification de la note |
| criteria_scores | JSON | Scores détaillés par critère |
| evaluation_prompt | Text | Prompt utilisé pour l'évaluation (si LLM) |
| created_at | DateTime | Date de création |

### 5.10 Ranking (Table Complexe Dédiée)

**Rôle :** Classement des modèles. C'est une entité relationnelle complexe avec sa propre table.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| execution_id | FK | Référence au run |
| ranking_type | Enum | global / by_question_type / by_suite / comparative |
| dimension | String | Ce sur quoi on classe (overall, accuracy, speed, etc.) |
| scope | JSON | Filtres appliqués (période, modèles comparés, etc.) |
| metadata | JSON | Métadonnées additionnelles |
| created_at | DateTime | Date de création |

### 5.11 Entrée de Ranking

**Rôle :** Position d'un modèle dans un ranking donné.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| ranking_id | FK | Référence au ranking |
| model_id | FK | Référence au modèle |
| position | Integer | Position dans le classement (1er, 2e, etc.) |
| score | Decimal | Score associé |
| previous_position | Integer | Position précédente (nullable) |
| delta_position | Integer | Changement de position |
| delta_score | Decimal | Changement de score |
| sample_size | Integer | Nombre de questions évaluées |
| metadata | JSON | Détails additionnels |

### 5.12 Itération

**Rôle :** Version globale d'une expérience de benchmark.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| code | String | Code unique (ITER-2025-01) |
| name | String | Nom descriptif |
| description | Text | Description des changements |
| changelog | Text | Liste détaillée des modifications |
| started_at | DateTime | Date de début |
| ended_at | DateTime | Date de fin (nullable si active) |
| is_current | Boolean | Itération active |
| config_snapshot | JSON | Configuration complète de l'itération |
| created_at | DateTime | Date de création |

### 5.13 Snapshot

**Rôle :** Capture d'état du système à un instant T.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| execution_id | FK | Référence au run |
| snapshot_type | Enum | ranking / config / full |
| data | JSON | Données capturées |
| created_at | DateTime | Date de création |

### 5.14 Comparaison Temporelle

**Rôle :** Analyse comparative entre deux périodes.

| Attribut | Type | Description |
|----------|------|-------------|
| id | UUID | Identifiant unique |
| model_id | FK | Référence au modèle |
| metric_name | String | Métrique comparée |
| period_type | Enum | week / month / quarter / year / custom |
| period_start | DateTime | Début de la période |
| period_end | DateTime | Fin de la période |
| value_start | Decimal | Valeur au début |
| value_end | Decimal | Valeur à la fin |
| delta | Decimal | Différence absolue |
| delta_percentage | Decimal | Différence en pourcentage |
| created_at | DateTime | Date de création |

---

## 6. Spécifications Fonctionnelles par Module

### 6.1 Module Provider Manager

#### Description
Gère la connexion à OpenRouter et l'abstraction pour futurs providers.

#### Fonctionnalités

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| Connexion à OpenRouter | 🔴 MANDATORY | Provider initial unique |
| Abstraction provider (interface commune) | 🔴 MANDATORY | Prépare extensibilité |
| Gestion des credentials sécurisée | 🔴 MANDATORY | Env vars, secrets manager |
| Gestion des erreurs API | 🔴 MANDATORY | Codes HTTP, timeouts |
| Retry avec backoff exponentiel | 🟠 MVP | 3 tentatives max |
| Rate limiting intelligent | 🟠 MVP | Respect des limites provider |
| Health check des providers | 🔵 NICE-TO-HAVE | Vérification de disponibilité |
| Support multi-providers | 🔵 NICE-TO-HAVE | OpenAI, Anthropic, etc. |
| Fallback automatique entre providers | ⚪ FUTURE | Si un provider fail |

#### Interface Attendue

```
ProviderInterface:
    - connect(credentials) → Connection
    - listModels() → Model[]
    - sendPrompt(model, prompt, config) → Response
    - getUsage(response) → UsageMetrics
    - healthCheck() → HealthStatus
```

### 6.2 Module Model Registry

#### Description
Catalogue des modèles disponibles avec leurs métadonnées et labels.

#### Fonctionnalités

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| CRUD modèles de base | 🔴 MANDATORY | Ajouter, modifier, supprimer |
| Association modèle-provider | 🔴 MANDATORY | Chaque modèle appartient à un provider |
| Labels personnalisés | 🔴 MANDATORY | **Demande explicite** |
| Statut actif/inactif | 🔴 MANDATORY | Pour filtrer les benchmarks |
| Métadonnées de base (contexte, coût) | 🟠 MVP | Informations clés |
| Tags/étiquettes personnalisées | 🔵 NICE-TO-HAVE | Filtrage avancé |
| Versioning des modèles | 🔵 NICE-TO-HAVE | Suivre les versions |
| Sync automatique via API OpenRouter | ⚪ FUTURE | Détection nouveaux modèles |
| Comparaison auto nouveau vs ancien | ⚪ FUTURE | Benchmark automatique des nouveaux |

### 6.3 Module Question Bank

#### Description
Gestion des questions de benchmark organisées en suites.

#### Fonctionnalités

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| CRUD questions | 🔴 MANDATORY | Base de questions |
| Types de questions | 🔴 MANDATORY | Catégorisation |
| Association question-type | 🔴 MANDATORY | Chaque question a un type |
| Suites de questions | 🟠 MVP | Regroupement cohérent |
| Versioning des questions | 🟠 MVP | Traçabilité des changements |
| Versioning des suites | 🟠 MVP | **Demande explicite** |
| Import/export questions | 🔵 NICE-TO-HAVE | JSON, CSV |
| Générateur de questions via LLM | ⚪ FUTURE | Questions dynamiques |
| Validation automatique de qualité | ⚪ FUTURE | Vérification cohérence |

#### Questions Statiques vs Dynamiques

| Type | Description | Usage |
|------|-------------|-------|
| **Statiques** | Toujours les mêmes questions | Mesurer l'évolution d'un modèle dans le temps |
| **Dynamiques** | Générées selon l'actualité ou le contexte | Tester l'adaptation aux nouvelles informations |

### 6.4 Module Benchmark Executor

#### Description
Orchestration des exécutions de benchmarks.

#### Fonctionnalités

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| Exécution manuelle | 🔴 MANDATORY | Pour tests et debug |
| Exécution complète d'une suite | 🔴 MANDATORY | Core functionality |
| Capture des réponses | 🔴 MANDATORY | Stockage brut |
| Mesure du temps de réponse | 🔴 MANDATORY | Métrique clé |
| Calcul des tokens/coûts | 🟠 MVP | Suivi budgétaire |
| Numérotation des itérations | 🟠 MVP | **Demande explicite** |
| Exécution planifiée automatique | 🟠 MVP | Autonomie |
| Gestion des erreurs (retry) | 🟠 MVP | Robustesse |
| Exécution partielle (subset de modèles) | 🔵 NICE-TO-HAVE | Flexibilité |
| Parallélisation des requêtes | 🔵 NICE-TO-HAVE | Performance |
| Reprise après échec | 🔵 NICE-TO-HAVE | Résilience |
| Mode dry-run | 🔵 NICE-TO-HAVE | Test sans appels API |

#### Pipeline d'Exécution (Toujours Identique)

1. Initialisation : Vérification des providers actifs
2. Chargement : Config campagne, suites, modèles
3. Génération : Liste cartésienne modèle × question
4. Injection : Préparation du prompt avec contexte
5. Exécution : Envoi des requêtes (gestion retries, timeouts)
6. Capture : Réponse brute, temps, coût, tokens
7. Persistance : Stockage immédiat des résultats

### 6.5 Module Evaluator

#### Description
Évaluation des réponses et attribution des scores.

#### Fonctionnalités

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| Évaluation rule-based simple | 🔴 MANDATORY | Exact match, regex |
| LLM-as-Judge basique | 🟠 MVP | Un modèle juge |
| Critères d'évaluation configurables | 🟠 MVP | Par question |
| Score normalisé | 🟠 MVP | Échelle commune |
| Justification de l'évaluation | 🟠 MVP | Transparence |
| Dimensions multiples de score | 🟠 MVP | Accuracy, style, etc. |
| Multi-juges (consensus) | 🔵 NICE-TO-HAVE | Moyenne ou vote |
| Calibration du juge | 🔵 NICE-TO-HAVE | Cohérence |
| Métriques NLP avancées | 🔵 NICE-TO-HAVE | BLEU, ROUGE, etc. |
| Human-in-the-loop | ⚪ FUTURE | Validation humaine |
| Fine-tuning du juge | ⚪ FUTURE | Modèle spécialisé |

#### Types d'Évaluation

| Type | Description | Cas d'Usage |
|------|-------------|-------------|
| **Exact Match** | Réponse == attendu | Questions factuelles |
| **Regex** | Pattern matching | Formats spécifiques |
| **Inclusion** | Mots-clés présents | Réponses ouvertes |
| **LLM Judge** | Autre LLM note la réponse | Qualité générale |
| **Tests Unitaires** | Exécution de code | Questions de coding |
| **Métriques NLP** | BLEU, ROUGE, etc. | Traduction, résumé |

### 6.6 Module Ranking Engine

#### Description
Calcul et gestion des rankings multi-dimensionnels.

#### Fonctionnalités

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| Ranking global simple | 🔴 MANDATORY | Score moyen par modèle |
| Stockage ranking en BDD dédiée | 🔴 MANDATORY | **Table propre demandée** |
| Ranking par type de question | 🟠 MVP | **Demande explicite** |
| Ranking avec dates | 🟠 MVP | **Demande explicite** |
| Ranking comparatif entre LLM | 🟠 MVP | **Demande explicite** |
| Ranking par itération | 🟠 MVP | **Demande explicite** |
| Position + delta vs précédent | 🟠 MVP | Évolution |
| Pondération des critères | 🔵 NICE-TO-HAVE | Personnalisation |
| Ranking ELO-style | 🔵 NICE-TO-HAVE | Comparaisons 1v1 |
| Ranking personnalisable | 🔵 NICE-TO-HAVE | Filtres custom |
| Prédiction de ranking | ⚪ FUTURE | ML sur historique |

#### Dimensions du Ranking

| Dimension | Description |
|-----------|-------------|
| **Temporelle** | Rang à l'instant T, évolution vs T-1 |
| **Catégorielle** | Rang sur Logique, Créativité, Code, etc. |
| **Comparative** | Rang relatif (Elo) par rapport aux autres modèles actifs |
| **Contextuelle** | Performance selon l'état du monde |

### 6.7 Module Temporal Analyzer

#### Description
Analyses temporelles et comparaisons dans le temps.

#### Fonctionnalités

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| Stockage historique complet | 🔴 MANDATORY | Base de l'analyse |
| Comparaison WoW (Week-over-Week) | 🟠 MVP | **Demande explicite** |
| Comparaison MoM (Month-over-Month) | 🟠 MVP | **Demande explicite** |
| Delta calculé (absolu et %) | 🟠 MVP | Quantification |
| Comparaison QoQ/YoY | 🔵 NICE-TO-HAVE | Long terme |
| Graphique d'évolution | 🔵 NICE-TO-HAVE | Visualisation |
| Détection de tendances | 🔵 NICE-TO-HAVE | Régression |
| Alertes sur changements significatifs | ⚪ FUTURE | Notifications |
| Prédictions | ⚪ FUTURE | Projection |

#### Métriques d'Évolution

| Métrique | Calcul | Usage |
|----------|--------|-------|
| Delta absolu | Score(T) - Score(T-1) | Changement brut |
| Delta relatif (%) | ((Score(T) - Score(T-1)) / Score(T-1)) × 100 | Changement proportionnel |
| Position delta | Rang(T) - Rang(T-1) | Mouvement dans le classement |
| Tendance | Régression linéaire sur N périodes | Direction générale |
| Volatilité | Écart-type sur N périodes | Stabilité du modèle |

### 6.8 Module Memory Manager

#### Description
Gestion de la mémoire, des itérations et de la persistance.

#### Fonctionnalités

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| Persistance en base de données | 🔴 MANDATORY | Core |
| Historique des résultats | 🔴 MANDATORY | Tout est gardé |
| Champ iteration_id | 🔴 MANDATORY | Version de l'expérience |
| Snapshots d'état | 🟠 MVP | Photo à un instant T |
| Traçabilité des changements d'itération | 🟠 MVP | Audit |
| Release notes par itération | 🔵 NICE-TO-HAVE | Documentation |
| Purge/archivage configurables | 🔵 NICE-TO-HAVE | Gestion espace |
| Backup automatique | 🔵 NICE-TO-HAVE | Sécurité |
| Restauration point-in-time | ⚪ FUTURE | Récupération |

#### Concept de Mémoire

La mémoire du système permet de :
- Rejouer une expérience précédente exactement
- Comprendre dans quelles conditions un score a été obtenu
- Situer un résultat dans l'histoire du système
- Comparer des pommes avec des pommes (même itération)

### 6.9 Module Reporter

#### Description
Génération des rapports et exports.

#### Fonctionnalités

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| Log d'exécution | 🔴 MANDATORY | Debug, audit |
| Rapport textuel basique | 🟠 MVP | Résultats lisibles |
| Export JSON | 🟠 MVP | Intégration |
| Tableaux comparatifs | 🟠 MVP | Rankings |
| Export CSV | 🔵 NICE-TO-HAVE | Analyse externe |
| Visualisations graphiques | 🔵 NICE-TO-HAVE | Courbes, heatmaps |
| Dashboard temps réel | 🔵 NICE-TO-HAVE | Monitoring |
| Export PDF | ⚪ FUTURE | Rapports formels |
| Intégration BI externe | ⚪ FUTURE | Metabase, etc. |

#### Types de Rapports

| Type | Description |
|------|-------------|
| **Rapport d'Exécution** | Résultats d'un run unique |
| **Rapport Comparatif** | Modèle A vs Modèle B |
| **Rapport d'Évolution** | Un modèle dans le temps |
| **Rapport par Catégorie** | Meilleurs modèles par type de question |

### 6.10 Module Scheduler

#### Description
Planification des exécutions automatiques.

#### Fonctionnalités

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| Exécution planifiée (cron-like) | 🟠 MVP | Autonomie |
| Support de plusieurs campagnes | 🟠 MVP | Flexibilité |
| Gestion des échecs (log, alerte) | 🟠 MVP | Robustesse |
| Déclenchement manuel | 🔴 MANDATORY | Override |
| Dashboard runs passés/à venir | 🔵 NICE-TO-HAVE | Visibilité |
| Pause/reprise d'une campagne | 🔵 NICE-TO-HAVE | Contrôle |
| Conditions de déclenchement | ⚪ FUTURE | Si coût < X, etc. |

---

## 7. Flux et Comportements du Système

### 7.1 Flux Principal : Exécution d'un Benchmark

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DÉCLENCHEUR                                                             │
│ (Planificateur automatique OU déclenchement manuel)                     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 1 : INITIALISATION                                                │
│ ├─ Charger le profil de benchmark                                       │
│ ├─ Vérifier les providers actifs                                        │
│ ├─ Récupérer la liste des modèles actifs                                │
│ ├─ Charger la suite de questions                                        │
│ ├─ Créer l'enregistrement d'exécution (nouvelle itération)              │
│ └─ Snapshot de la configuration                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 2 : BOUCLE D'EXÉCUTION                                            │
│ Pour chaque MODÈLE:                                                     │
│   Pour chaque QUESTION:                                                 │
│     ├─ Préparer le prompt (avec contexte si applicable)                 │
│     ├─ Envoyer au provider via l'abstraction                            │
│     ├─ Capturer: réponse, temps, tokens, coût                           │
│     ├─ Persister le résultat brut immédiatement                         │
│     └─ Gérer les erreurs (retry si nécessaire)                          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 3 : ÉVALUATION                                                    │
│ Pour chaque RÉSULTAT:                                                   │
│   ├─ Appliquer l'évaluation automatique si applicable                   │
│   ├─ Si LLM-as-Judge: envoyer au modèle évaluateur                      │
│   ├─ Calculer le score brut                                             │
│   ├─ Normaliser le score                                                │
│   └─ Persister l'évaluation                                             │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 4 : CALCUL DES RANKINGS                                           │
│ ├─ Agréger les scores par modèle                                        │
│ ├─ Calculer le ranking global                                           │
│ ├─ Calculer les rankings par type de question                           │
│ ├─ Comparer avec l'itération précédente (deltas)                        │
│ └─ Persister tous les rankings                                          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 5 : ANALYSE TEMPORELLE                                            │
│ ├─ Calculer les comparaisons période/période (WoW, MoM)                 │
│ ├─ Mettre à jour les tendances                                          │
│ └─ Détecter les changements significatifs                               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 6 : FINALISATION                                                  │
│ ├─ Créer le snapshot final                                              │
│ ├─ Générer le rapport d'exécution                                       │
│ ├─ Mettre à jour le statut de l'exécution                               │
│ └─ Notifier si configuré                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 États du Système

```
     ┌──────────────────────────────────────────────────────────────┐
     │                                                              │
     ▼                                                              │
   IDLE ──► INITIALIZING ──► EXECUTING ──► EVALUATING ──►          │
                │                │             │                    │
                │                │             │                    │
                └────────────────┴─────────────┘                    │
                                 │                                  │
                              FAILED                                │
                                 │                                  │
                                 └──────────────────────────────────┘
                                        (retry ou abandon)

   EVALUATING ──► RANKING ──► ANALYZING ──► FINALIZING ──► IDLE
```

### 7.3 Gestion des Erreurs

| Type d'Erreur | Comportement |
|---------------|--------------|
| Timeout API | Retry avec backoff exponentiel, max 3 tentatives |
| Rate limit | Pause (respect header Retry-After), puis retry |
| Erreur auth | Stop exécution, alerte immédiate |
| Réponse invalide | Logger, marquer comme échec, continuer |
| Erreur évaluateur | Logger, marquer comme non-évalué, continuer |
| Erreur système | Stop exécution, état sauvegardé pour reprise |

### 7.4 Garanties de Déterminisme

Le système garantit que pour :
- La même configuration
- Les mêmes modèles
- Les mêmes questions
- Les mêmes paramètres d'appel

Le **comportement du système** sera identique (seules les réponses des LLM varieront).

**Éléments garantissant le déterminisme :**
- Seed aléatoire fixé si applicable
- Ordre d'exécution défini (pas de parallélisation non-déterministe dans MVP)
- Logging complet pour reproduction
- Configuration versionnée et snapshotée

---

## 8. Dimensions Temporelles et Mémoire

### 8.1 Granularité des Données Temporelles

| Niveau | Description | Usage |
|--------|-------------|-------|
| **Réponse** | Timestamp exact de chaque réponse | Analyse fine, latence |
| **Question** | Agrégation par question dans un run | Comparaison inter-modèle |
| **Exécution/Run** | Une exécution complète | Point de référence principal |
| **Jour** | Agrégation journalière | Tendances court terme |
| **Semaine** | Agrégation hebdomadaire | WoW - **demandé explicitement** |
| **Mois** | Agrégation mensuelle | MoM - **demandé explicitement** |
| **Trimestre** | Agrégation trimestrielle | QoQ - tendances moyen terme |
| **Année** | Agrégation annuelle | YoY - tendances long terme |

### 8.2 Types de Comparaisons

#### Comparaison Séquentielle
- Itération N vs Itération N-1
- Semaine S vs Semaine S-1
- Mois M vs Mois M-1

#### Comparaison à Date Fixe
- Semaine actuelle vs même semaine année précédente
- Snapshot actuel vs snapshot de référence

#### Comparaison de Plage
- Moyenne Q1 vs Q4
- Évolution sur les 12 derniers mois

### 8.3 Concept d'Itération

Une **itération** représente une version stable de l'expérience de benchmark :
- Version des suites de questions utilisées
- Version du prompt et de la méthodologie d'évaluation
- État du catalogue de modèles à cet instant

**Exemple :**
- `ITER-2025-01` : Première version, benchmark reasoning v1, 50 questions
- `ITER-2025-02` : Ajout de 10 questions, changement du prompt de judge
- `ITER-2025-03` : Ajout de 5 nouveaux modèles

**Règle clé :** Les résultats d'un run sont toujours liés à leur itération. On ne compare que des runs de même itération pour éviter les biais.

### 8.4 Rétention des Données

| Type de Donnée | Rétention | Notes |
|----------------|-----------|-------|
| Résultats bruts | Illimitée | Nécessaire pour recalculs |
| Évaluations | Illimitée | Audit trail |
| Rankings | Illimitée | Historique essentiel |
| Snapshots | 1 an détaillé, puis agrégé | Optimisation espace |
| Logs | 90 jours | Troubleshooting |

---

## 9. Modèle de Données Conceptuel

### 9.1 Schéma Relationnel

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  PROVIDER   │       │    MODEL    │       │  QUESTION   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │──┐    │ id          │   ┌───│ id          │
│ name        │  │    │ provider_id │◄──┘   │ content     │
│ api_base    │  │    │ label       │       │ type_id     │◄──┐
│ status      │  │    │ status      │       │ difficulty  │   │
│ config      │  │    │ tags        │       │ version     │   │
└─────────────┘  │    │ metadata    │       └─────────────┘   │
                 │    └─────────────┘                         │
                 │          │                                 │
                 │          │        ┌─────────────────┐      │
                 │          │        │  QUESTION_TYPE  │      │
                 │          │        ├─────────────────┤      │
                 │          │        │ id              │──────┘
                 │          │        │ name            │
                 │          │        │ weight          │
                 │          │        └─────────────────┘
                 │          │
                 │          │        ┌─────────────────┐
                 │          │        │ QUESTION_SUITE  │
                 │          │        ├─────────────────┤
                 │          │        │ id              │
                 │          │        │ name            │
                 │          │        │ version         │
                 │          │        └────────┬────────┘
                 │          │                 │
                 │          │        ┌────────┴────────┐
                 │          │        │ SUITE_QUESTION  │
                 │          │        ├─────────────────┤
                 │          │        │ suite_id        │
                 │          │        │ question_id     │
                 │          │        │ order           │
                 │          │        └─────────────────┘
                 │          │
                 │          │
┌────────────────┴──────────┴────────────────────────────────┐
│                       BENCHMARK_EXECUTION                   │
├─────────────────────────────────────────────────────────────┤
│ id                                                          │
│ campaign_id                                                 │
│ iteration_id                                                │
│ iteration_number                                            │
│ started_at / completed_at                                   │
│ status                                                      │
│ config_snapshot                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                     BENCHMARK_RESULT                        │
├─────────────────────────────────────────────────────────────┤
│ id                                                          │
│ execution_id ──────────────────────────────────────────────►│
│ model_id ───────────────────────────────────────────────────►│
│ question_id ────────────────────────────────────────────────►│
│ response_content                                            │
│ response_time_ms / tokens / cost                            │
│ status                                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                        EVALUATION                           │
├─────────────────────────────────────────────────────────────┤
│ id                                                          │
│ result_id ──────────────────────────────────────────────────►│
│ evaluator_type (rule_based / llm_judge)                     │
│ evaluator_model_id (si LLM)                                 │
│ dimension                                                   │
│ score / normalized_score                                    │
│ justification                                               │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                         RANKING                             │
├─────────────────────────────────────────────────────────────┤
│ id                                                          │
│ execution_id                                                │
│ ranking_type (global / by_type / comparative)               │
│ dimension                                                   │
│ scope (JSON)                                                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                     RANKING_ENTRY                           │
├─────────────────────────────────────────────────────────────┤
│ id                                                          │
│ ranking_id                                                  │
│ model_id                                                    │
│ position                                                    │
│ score                                                       │
│ previous_position / delta_position                          │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                        ITERATION                            │
├─────────────────────────────────────────────────────────────┤
│ id                                                          │
│ code (ITER-2025-01)                                         │
│ name / description / changelog                              │
│ is_current                                                  │
│ config_snapshot                                             │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                   TEMPORAL_COMPARISON                       │
├─────────────────────────────────────────────────────────────┤
│ id                                                          │
│ model_id                                                    │
│ metric_name                                                 │
│ period_type (week / month / quarter / year)                 │
│ period_start / period_end                                   │
│ value_start / value_end                                     │
│ delta / delta_percentage                                    │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Relations Principales

```
Provider          1 ─────── N    Model
Model             1 ─────── N    Benchmark_Result
Model             1 ─────── N    Ranking_Entry
Model             1 ─────── N    Evaluation (as evaluator)

Question          N ─────── 1    Question_Type
Question          N ─────── M    Question_Suite (via Suite_Question)

Benchmark_Execution   1 ─── N    Benchmark_Result
Benchmark_Execution   1 ─── N    Ranking
Benchmark_Execution   1 ─── N    Snapshot

Benchmark_Result      1 ─── N    Evaluation

Ranking               1 ─── N    Ranking_Entry

Campaign              1 ─── N    Benchmark_Execution
Iteration             1 ─── N    Benchmark_Execution
```

### 9.3 Matrice de Dépendances

```
                              Dépend de →
                    ┌──────┬───────┬───────┬──────┬──────┬──────┐
                    │ Prov │ Model │ Quest │ Exec │ Eval │ Rank │
       ┌────────────┼──────┼───────┼───────┼──────┼──────┼──────┤
       │ Provider   │  -   │       │       │      │      │      │
       │ Model      │  ●   │   -   │       │      │      │      │
       │ Question   │      │       │   -   │      │      │      │
       │ Execution  │      │   ●   │   ●   │  -   │      │      │
       │ Evaluation │      │   ●   │   ●   │  ●   │  -   │      │
       │ Ranking    │      │   ●   │   ●   │  ●   │  ●   │  -   │
       └────────────┴──────┴───────┴───────┴──────┴──────┴──────┘

       ● = dépendance directe
```

---

## 10. Priorisation MoSCoW

### 10.1 Légende

| Code | Catégorie | Définition |
|------|-----------|------------|
| 🔴 | MANDATORY | Indispensable au fonctionnement de base. Le système ne peut pas exister sans. |
| 🟠 | MVP | Nécessaire pour une première version utilisable et démontrable. |
| 🔵 | NICE-TO-HAVE | Amélioration significative, non bloquante pour le lancement. |
| ⚪ | FUTURE | Vision long terme, hors scope initial. |

### 10.2 Vue Synthétique par Module

#### Provider & Modèles

| Fonctionnalité | Priorité |
|----------------|----------|
| Connexion OpenRouter | 🔴 |
| Abstraction provider | 🔴 |
| Credentials sécurisés | 🔴 |
| CRUD modèles | 🔴 |
| Labels personnalisés | 🔴 |
| Statut actif/inactif | 🔴 |
| Retry avec backoff | 🟠 |
| Rate limiting | 🟠 |
| Tags personnalisés | 🔵 |
| Multi-providers | 🔵 |
| Sync auto API | ⚪ |

#### Questions & Suites

| Fonctionnalité | Priorité |
|----------------|----------|
| CRUD questions | 🔴 |
| Types de questions | 🔴 |
| Suites de questions | 🟠 |
| Versioning | 🟠 |
| Import/export | 🔵 |
| Générateur LLM | ⚪ |

#### Exécution

| Fonctionnalité | Priorité |
|----------------|----------|
| Exécution manuelle | 🔴 |
| Capture réponses | 🔴 |
| Mesure temps | 🔴 |
| Calcul tokens/coûts | 🟠 |
| Numéro d'itération | 🟠 |
| Exécution planifiée | 🟠 |
| Parallélisation | 🔵 |
| Reprise après échec | 🔵 |

#### Évaluation

| Fonctionnalité | Priorité |
|----------------|----------|
| Rule-based simple | 🔴 |
| LLM-as-Judge | 🟠 |
| Score normalisé | 🟠 |
| Dimensions multiples | 🟠 |
| Multi-juges | 🔵 |
| Métriques NLP | 🔵 |

#### Ranking

| Fonctionnalité | Priorité |
|----------------|----------|
| Ranking global | 🔴 |
| Table dédiée BDD | 🔴 |
| Par type de question | 🟠 |
| Avec dates | 🟠 |
| Comparatif entre LLM | 🟠 |
| Par itération | 🟠 |
| Position + delta | 🟠 |
| Pondération | 🔵 |
| ELO-style | 🔵 |

#### Temporel & Mémoire

| Fonctionnalité | Priorité |
|----------------|----------|
| Historique complet | 🔴 |
| Iteration_id | 🔴 |
| Comparaison WoW | 🟠 |
| Comparaison MoM | 🟠 |
| Snapshots | 🟠 |
| Graphiques évolution | 🔵 |
| Alertes changements | ⚪ |

#### Reporting

| Fonctionnalité | Priorité |
|----------------|----------|
| Logs d'exécution | 🔴 |
| Rapport textuel | 🟠 |
| Export JSON | 🟠 |
| Tableaux comparatifs | 🟠 |
| Export CSV | 🔵 |
| Dashboard | 🔵 |
| Export PDF | ⚪ |

---

## 11. Roadmap par Phases

### Phase 0 : Concept & Documentation
**Objectif :** Finaliser la conception avant tout développement.

| Livrable | Description |
|----------|-------------|
| ✅ Ce document | Bible du projet |
| Définition des premières suites | 20-50 questions de test |
| Choix technologiques | Stack, BDD, hébergement |
| Réponses aux questions ouvertes | Décisions clés |

### Phase 1 : Squelette / Fondations
**Objectif :** Le système existe et peut faire un run basique.

| Livrable | Description |
|----------|-------------|
| Connecteur OpenRouter | Connexion API stable |
| Registre des modèles | CRUD basique |
| Boucle d'exécution simple | Questions fixes → Modèles fixes |
| Stockage brut | Sauvegarde réponses + timestamp |
| Structure de ranking V1 | Table simple : Modèle_ID \| Date \| Score |

**Critère de succès :** Pouvoir lancer manuellement un benchmark sur 3 modèles, 10 questions, et voir un ranking basique.

### Phase 2 : MVP Autonome
**Objectif :** Le système tourne tout seul et produit des résultats exploitables.

| Livrable | Description |
|----------|-------------|
| Exécution planifiée | Job hebdomadaire automatique |
| LLM-as-Judge basique | Un modèle juge les réponses |
| Rankings multi-dimensions | Par type de question |
| Labels dynamiques | Tags sur les modèles |
| Comparaison WoW | Semaine N vs N-1 |

**Critère de succès :** Le système fait un benchmark hebdo automatique, produit des rankings par catégorie, et montre l'évolution d'une semaine à l'autre.

### Phase 3 : Mémoire & Profondeur
**Objectif :** Le système a une vraie mémoire et permet des analyses riches.

| Livrable | Description |
|----------|-------------|
| Itérations structurées | Changelog, versioning |
| Comparaison MoM | Mois par mois |
| Snapshots complets | Photo de l'état à chaque run |
| Dimensions multiples de score | Accuracy, style, reasoning |
| Reporting avancé | Export JSON/CSV, tableaux |

**Critère de succès :** Pouvoir comparer les performances d'un modèle sur 3 mois avec drill-down par dimension.

### Phase 4 : Extensibilité & UI
**Objectif :** Le système est mature et utilisable par d'autres.

| Livrable | Description |
|----------|-------------|
| Dashboard web | Interface de consultation |
| Visualisations graphiques | Courbes d'évolution |
| Alertes | Notifications sur changements significatifs |
| Multi-providers (préparation) | Architecture prête |
| Documentation utilisateur | Guide d'utilisation |

### Phase 5 : Vision Lointaine
| Livrable | Description |
|----------|-------------|
| Multi-providers actifs | OpenAI direct, Anthropic, etc. |
| Benchmark adversarial | Deux modèles débattent |
| Fine-tuning du juge | Modèle spécialisé |
| Injection de World State | Questions contextuelles auto |
| Auto-sélection de modèle | Choix optimal par use case |

---

## 12. Considérations Transversales

### 12.1 Sécurité

| Aspect | Mesure |
|--------|--------|
| Credentials | Stockage sécurisé (env vars, secrets manager). Jamais en dur dans le code. |
| API Keys | Ne jamais logger, ne jamais exposer dans les rapports |
| Données | Chiffrement au repos si données sensibles dans les questions |
| Accès | Authentification pour interface admin (si applicable) |

### 12.2 Performance

| Aspect | Mesure |
|--------|--------|
| Requêtes API | Respect strict des rate limits |
| Base de données | Indexation appropriée (model_id, execution_id, date) |
| Historique | Partitionnement si volume > 1M enregistrements |
| Mémoire | Streaming des réponses longues |

### 12.3 Observabilité

| Aspect | Mesure |
|--------|--------|
| Logging | Structuré (JSON), niveaux appropriés (DEBUG/INFO/ERROR) |
| Métriques | Temps d'exécution, taux d'erreur, coûts par run |
| Tracing | Corrélation des requêtes (trace_id) |
| Alerting | Échecs de run, anomalies de performance |

### 12.4 Maintenabilité

| Aspect | Mesure |
|--------|--------|
| Code | Séparation claire des responsabilités (modules) |
| Configuration | Externalisée, versionnée, documentée |
| Documentation | À jour avec le code (README par module) |
| Tests | Couverture des flux critiques (exécution, évaluation, ranking) |

### 12.5 Coûts

| Poste | Considération |
|-------|---------------|
| Appels LLM (benchmarks) | Budget à définir par run |
| Appels LLM (juge) | Potentiellement le plus gros poste |
| Stockage | Croissance linéaire avec historique |
| Compute | Généralement faible (orchestration) |

**Estimation préliminaire :**
- 50 questions × 20 modèles × 1000 tokens moyen = 1M tokens/run
- Si juge = 500 tokens/évaluation × 1000 évaluations = 500k tokens/run
- Total : ~1.5M tokens/run

---

## 13. Questions Ouvertes et Décisions à Prendre

### 13.1 Questions Techniques

| # | Question | Options | Impact |
|---|----------|---------|--------|
| T1 | Quelle base de données ? | PostgreSQL, MySQL, MongoDB | Architecture, performances |
| T2 | Quel framework/langage ? | PHP/Symfony, Python/FastAPI, Node/NestJS | Stack, maintenance |
| T3 | Hébergement ? | Local, Cloud (AWS/GCP/Azure), Docker | Coûts, scalabilité |
| T4 | Scheduler ? | Cron système, Symfony Messenger, Celery | Robustesse |

### 13.2 Questions Fonctionnelles

| # | Question | Options | Impact |
|---|----------|---------|--------|
| F1 | Fréquence de benchmark cible ? | Quotidien, Hebdo, Mensuel | Coûts, pertinence |
| F2 | Volume de modèles initial ? | 10, 20, 50+ | Coûts, temps d'exécution |
| F3 | Volume de questions par suite ? | 20, 50, 100+ | Profondeur vs coût |
| F4 | Quel modèle comme juge initial ? | GPT-4, Claude 3 Opus, autre | Qualité, coût |
| F5 | Types de questions prioritaires ? | Reasoning, Code, General | Focus initial |
| F6 | Besoin d'UI V1 ? | Oui/Non | Scope, timeline |

### 13.3 Questions Business

| # | Question | Options | Impact |
|---|----------|---------|--------|
| B1 | Budget API mensuel estimé ? | $50, $200, $500+ | Contraintes scope |
| B2 | Timeline souhaitée pour MVP ? | 1 mois, 3 mois, 6 mois | Planning |
| B3 | Usage interne ou externe ? | Interne ERA, Produit | Exigences qualité |
| B4 | Données sensibles dans questions ? | Oui/Non | Sécurité requise |

### 13.4 Décisions à Documenter

Chaque décision prise devra être documentée avec :
- **Date** de la décision
- **Contexte** de la décision
- **Options** considérées
- **Choix** final
- **Raison** du choix

---

## 14. Annexes

### Annexe A : Récapitulatif des Demandes Explicites

Les éléments suivants ont été **explicitement demandés** et doivent être présents :

1. ✅ Système autonome de benchmarking
2. ✅ Peu d'interactions / comportement déterministe
3. ✅ Comparaisons temporelles (semaine/semaine, mois/mois, etc.)
4. ✅ Connexion OpenRouter en premier
5. ✅ Lecture de documentation API
6. ✅ Ajout facile de nouveaux modèles
7. ✅ Labels personnalisés sur les modèles
8. ✅ Rankings avec leur propre table (entité séparée)
9. ✅ Rankings par type de question
10. ✅ Rankings avec dates
11. ✅ Rankings avec comparaisons entre LLM
12. ✅ Rankings par itération
13. ✅ Gestion de la mémoire/historique
14. ✅ Approche step-by-step / découpage en phases
15. ✅ Chaque concept isolé

### Annexe B : Personas et Usages

#### AI Director / Lead (Tom)
- **Besoin :** Vision macro des tendances, choix stratégique de modèles
- **Usage :** Consulte dashboards, snapshots de rankings, diffs semaine/mois

#### Tech Lead / Dev
- **Besoin :** Savoir quels modèles privilégier par use case
- **Usage :** Consulte classements par type de tâche (code, reasoning)

#### Data / AI Engineer
- **Besoin :** Vérifier si un changement de dataset modifie les résultats
- **Usage :** Utilise la mémoire (itérations) pour analyser les impacts

#### Stakeholders Non Techniques
- **Besoin :** Confiance dans les choix de modèles
- **Usage :** Lecture de rapports simplifiés

### Annexe C : Exemples de Questions de Benchmark

#### Type : Raisonnement Logique
```
Prompt: "Si tous les chats sont des mammifères, et que certains mammifères
vivent dans l'eau, est-il possible qu'un chat vive dans l'eau ?
Explique ton raisonnement."

Évaluation: LLM-as-Judge sur la qualité du raisonnement
```

#### Type : Code
```
Prompt: "Écris une fonction Python qui inverse une liste sans utiliser
la méthode reverse() ni le slicing [::-1]."

Évaluation: Test unitaire + LLM-as-Judge sur la qualité du code
```

#### Type : Factualité
```
Prompt: "Quelle est la capitale de l'Australie ?"

Réponse attendue: "Canberra"
Évaluation: Exact match (case-insensitive)
```

#### Type : Créativité
```
Prompt: "Écris un haïku sur le passage du temps."

Évaluation: LLM-as-Judge sur créativité et respect du format
```

### Annexe D : Structure de Documentation Recommandée

```
docs/
├── 00_VISION_GLOBALE.md           ← Contexte, vision, objectifs
├── 01_GLOSSAIRE_CONCEPTS.md       ← Tous les termes définis
├── 02_PERSONAS_USAGES.md          ← Acteurs et leurs besoins
├── 03_SPEC_FONCTIONNELLE.md       ← Modules détaillés
├── 04_MODELE_DONNEES.md           ← Schema BDD
├── 05_FLUX_COMPORTEMENTS.md       ← Pipelines et états
├── 06_PRIORISATION_MOSCOW.md      ← Table de priorisation
├── 07_ROADMAP_PHASES.md           ← Planning par phase
├── 08_DECISIONS_ADR/              ← Architecture Decision Records
│   ├── ADR-001-choix-bdd.md
│   ├── ADR-002-choix-framework.md
│   └── ...
└── 09_QUESTIONS_OUVERTES.md       ← Tracking des décisions
```

---

## Signatures et Validation

| Rôle | Nom | Date | Signature |
|------|-----|------|-----------|
| Product Owner | Tom | ___ | ___ |
| Tech Lead | ___ | ___ | ___ |
| Reviewer | ___ | ___ | ___ |

---

*Document généré le 24 novembre 2025*
*Version 1.0 - Document Fondateur*
*Prochaine révision prévue : Après validation des questions ouvertes*

---

> **Ce document est la bible du projet SABE (Système Autonome de Benchmarking Évolutif). Toute modification significative doit être versionnée et validée.**