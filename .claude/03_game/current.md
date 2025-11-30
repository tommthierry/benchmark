


# CONTEXT
We are in a good working state.
All our required concepts are working well and should be following our coding standards.

All our documentation should be to date and really deeply detailed for you to go on and learn how we are currently managing things.
You need to start reading important ones that will help you accomplish the new goal.

# New Goal
I want to enhance the game control and how the admin can see and validate things as well as going to the next step.

Let me recap how our app will go.

- We start a new round and established from the AI/LLM in play the new Master of the round. That Master will be the one that select the new question from the pool of topic and create its own question. He will not answer and he will be the main overall judge.
- Once a new question is ask, each llm goes one by one and answer
- Once all the llm answered, the judging selection process goes.
- All llm judge the others and rank them it the goes in the stats.
- The master llm vote too and if there is a tie have the position to determine which one is better
- Then we go around and select the next master and begin the next phase.

A game is can be stoped/restarted.
When we stop / restart a game we always add all model active.

I want to add a url /admin/game where the admin will be able to see, understand fully and deeply where we are on the game, who's playing and to trigger the next phase knowing what it will be.

Next button should be all these action (maybe I'm forgetting some step, challenge my ideas, i'm still brainstorming here)

- Start game
  - /arena is empty and clearly indicate we are yet to start a game
  - When we start the game all the AI active are pushed on screen with a ranking of 0
- Select new Master
  - Randomly select a new master (only the first round is random, other will be the next rotating clockwise)
  - This will set the new master visibly on screen clearly
- Set a new question
  - The master will be prompted to create a new question
  - When the llm return the new question we set it on screen visible along the "type" of question
- Answer question
  - One LLM at a time (so we need to click next step as much as there is llm on game to complete a turn)
  - next llm in line will "answer" the question
  - We need a state for the thinking mode and a new state when the llm answered
  - We also need a step for the llm that is "next" to answer
  - Answer is visible when we click on the llm
  - during its thinking phase we can see it thinking on screen
  - When the llm answer we can see like a bubble with the first 15 words of it, like a cartoon bubble or something like that that visibly indicate that it's answering
- Ranking
  - When all the llm have answer the master question (master does not answer), we go into ranking mode / we need a visual things for that
  - Same, all of it goes clockwise one at a time.
  - still thinking and ranking
- Finishing round
  - once all the llm have answer and rank, we are in the closing round.
  - During this phase we simply display like the leaderboard of this turn along the initial question
  - If we click on the leaderboard in one llm we again, same as before can see their answer and their ranking

- Next round
  - We continue, select the new master clockwise and begin all over again.

--------------

So the goal here is two things
- Make sure the new page /admin/game clearly indicate where we are, what is the next step and have that big manual buttton (when we are in manual mode)
  - We need to remove the manual button from /admin/settings as well as the execution mode. lets keep the game setting in /admin/settings

- Make sure the /arena follow properly exactly what we discussed in term of feature, ux/ui, all of it.

--------------------------------
Now that you know what the project is, you will create a complete, base plan to setup "the next step" of our project.
You know the project, now your job is to investigated, browse, search the lastest best library/setup/architecture for our new goal.

--------

Your role is to act the project project manager, product owner and main tech lead developer all together to create the main document of concept, complete and comprehensive plan in phase and step by step for each phase.

Your goal is to create multiple document that will be each phase of our project and for each phase you will double check things browsing to be sure of best practice and latest libraries we will use as well and creating a comphrehensive step by step plan to follow and focus on.

Understand that the plan will be execute by coding agent that will start from nothing and will need to understand the global picture and the project goal and more importantly the goal to accomplish on each phase and what has beed done previously so the plan need to be trackable and clear and complete, while still being not too long so that we don't fill the context lenght of our ai coding agent from the start.

For this step, the goal is not to do any coding at all.
We are in the searching, analyzing options, and planning phase of our execution.
We will evaluate our options and look at what we have already set up in our app as documentation for these steps.

This is a really big iteration that we want to accomplish, so we need to decompose it into phases, where each phase also has multiple clear steps. Set it up in a way where agents understand what was done, what is yet to be done, what's the next phase/step to do, and how to mark things as done.

Your outputs files will be place in ./plan
I want you to create MASTER_PLAN.md and multiple PHASE_0 / PHASE_1 as needed to accomplish what we want her.e

You will create the new plan files, for the next coding agents to understand what we are trying to do. Then, each PHASE will be a clear pathway to a specific part of the execution.
We really want to make things easy to read and not add irrelevant things per file, because we are using LLM coding agents that are token-limited by their context length.

You need to understand that the next steps will not be done by you but by other AI coding agents in different iterations. So your output needs to contain all the important details of what we want to accomplish, be a perfect plan for the agent to understand what to do and when, and be able to know what has been done, continue, and then indicate what has been done.
We will always need to keep in mind the LLM's main limitation, which is the content length. So yes, we need to be in-depth, but not have files that are too large. We should follow best practices here.


All of it really need to be grounded on our project concept and what we want to do.
Coding need to follow current standard and best practice on each phase. Each phase need to be testable, and well documentated too.
---------

Start validating our app is currently setup, do not assume, verify and read. Then focus on your goal