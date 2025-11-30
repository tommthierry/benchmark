
# CONTEXT
We are in a good working state.
All our required concepts are working well and should be following our coding standards.

All our documentation should be to date and really deeply detailed for you to go on and learn how we are currently managing things.
You need to start reading important ones that will help you accomplish the new goal.

# New Goal
I want to accomplish multiple goal here

First is to revisit the /admin/settings so that it is now call the /admin/status

Then I want to create a real settings page where we will be able to control the flow of our app.
In this page we will be able to control the execution reccuring logic like the time of the cron
we should be able to control the cron with an expression or set up a manual execution time.
When its a cron that control our app, everytime the cron is triggered we iterate. if its manual, everytime the button is push we iterate.
An iteration is a step.
You need to validate that the flow goes like this:
- We start a new round and established from the AI/LLM in play the new Master of the round. That Master will be the one that select the new question from the pool of topic and create its own question. He will not answer and he will be the main overall judge.
- Once a new question is ask, each llm goes one by one and answer
- Once all the llm answered, the judging selection process goes.
- All llm judge the others and rank them it the goes in the stats.
- The master llm vote too and if there is a tie have the position to determine which one is better
- Then we go around and select the next master and begin the next phase.

Each steps is something that is an "iteration" and iteration is not the full round. an iteration is a step.
We need to make sure our app is setup like this to follow this structure.

Then once this big step is validate and accomplished we will create a full frontend app.
This frontend app is pulling its data from the backend to automatically be updated. Either that or the backend is pushin g to the frontend.
We need to study whats the best for us, the easiest and cleanest.
The new frontend page I want will do nothing except display the current situation. The website will be public so everybody can see the current situation.
The frontend will display the llm in a cool fun way having like their round.
We will see them in some type of circle with a way to see who's the master of the round, who's the current llm in play that is either talking/answering or judging depending on which step we are.
We see the name of the llm. We can see the current question in play with the current topic of question.
We can see who's already talk/judge and if we click on the llm in question we see their answer/ranking and thinking process.
We need to think a lot about what the cleanest ui/ux for this. I want it to be best practice and use nice library and be DRY and SOLID and KISS.
We want here to think about having a design that is slick and NOT what AI usually do so take time for this step to browse what are the giveaway that a design comes from an ai coding agent. Then once you have everything you will be able to know what you want to create for this frontend.


The end result is a board of AI that question themselves and rank themselves.
We need to be able to have an admin section to enable /disable model easily.
To also edit prompt we will send to AI from the master of a turn to the llm answering and all.

This is a proper thinking and plan but it is not OUR own plan, we need to revalidate and make sure to create our own plan that will work in our own app on our own flow.

We have a lot to do and accomplish here, as you can see—a lot of new concepts and specific tools for a specific feature.
It's important to consider that we already have a lot of tools and we want to follow the same architecture/flow and logic so that everything stays DRY, scalable and more importantly maintenable.


You can read all of our project from file in ./plan

You need to start with :
plan\MASTER_PLAN.md
plan\PHASE_0_SETTINGS.md
plan\PHASE_1_GAME_ENGINE.md
plan\PHASE_2_REALTIME.md
plan\PHASE_3_ARENA_UI.md


## Execution
It is now time to go on and execute the next phase that is yet to be done (in order).
One phase at time.
You will go on and execute the next phase available and ready to be executed. You will follow our plan and our logic.
You will create your own internal plan / steps to keep track and once you have executed, tested, double check and documented you will make sure to update documents (.md) so that the next agent knows exactly what next phase is ready to for him to tackle.
Make sure to challenge it when/if needed, things need to be kept dry and more importantly best practice.
You do not test in the frontend, the user does. You can test api, backend stuffs with unit test.

You need to understand that the next phase will not be done by you but by other AI coding agent in different iteration.
We will have to always keep in mind about LLM main limitation which is the content length. So yes we need to be in depth but not have file to crazy, we should follow best practice here.

## Big Task Alert
It's a big task and I want you to do first create your own plan, step by step with a clear, complete and detailled.
Remember, you can browse the web if you need up to date information, documentation or look for specific libraries at any point.
At anytime if you find something like an error or a new concept that is impacting the plan, make sure to revalidate and asses if the plan is still ok or if it needs adjustments based on the specific situation you are in.

Decide in the best way to do this task for our project, specifications and requirements.
It's a big project so in everything we do/create/update, the main focus is that we want resusability, DRY and simple clean code.

## Implementation Guidelines

1. **Build on What Exists**: Understand and properly integrate with existing code
2. **Maintain Consistency**: Follow established patterns and conventions in the codebase
3. **Test Everything**: Test new features AND their integration with existing ones
4. **Validate Assumptions**: Use web browsing to verify library versions, best practices, and current standards
5. **Challenge the Plan if Needed**: If you discover issues or better approaches, document them and adjust
6. **Keep It Clean**: Refactor if needed to maintain code quality as the project grows

Always keep this in mind and make this clear in the plan and architecture file you will create.

---

We really want to make things easy to read and not add non relevant things per file because we are using llm coding agent that are token limited by their context length.

----

We did it all. Nice, now its time to update our docs in the ./docs/ folder and the README.md
I also want you to verify the complete app and make sure all of it is DRY, clean and well executed.

Make sure our app really is what we want it to be.
Double check and verify it all.




























# CONTEXT
We are in a good working state.
All our required concepts are working well and should be following our coding standards.

All our documentation should be to date and really deeply detailed for you to go on and learn how we are currently managing things.
You need to start reading important ones that will help you accomplish the new goal.

# New Goal
I want to accomplish multiple goal here

First is to revisit the /admin/settings so that it is now call the /admin/status

Then I want to create a real settings page where we will be able to control the flow of our app.
In this page we will be able to control the execution reccuring logic like the time of the cron
we should be able to control the cron with an expression or set up a manual execution time.
When its a cron that control our app, everytime the cron is triggered we iterate. if its manual, everytime the button is push we iterate.
An iteration is a step.
You need to validate that the flow goes like this:
- We start a new round and established from the AI/LLM in play the new Master of the round. That Master will be the one that select the new question from the pool of topic and create its own question. He will not answer and he will be the main overall judge.
- Once a new question is ask, each llm goes one by one and answer
- Once all the llm answered, the judging selection process goes.
- All llm judge the others and rank them it the goes in the stats.
- The master llm vote too and if there is a tie have the position to determine which one is better
- Then we go around and select the next master and begin the next phase.

Each steps is something that is an "iteration" and iteration is not the full round. an iteration is a step.
We need to make sure our app is setup like this to follow this structure.

Then once this big step is validate and accomplished we will create a full frontend app.
This frontend app is pulling its data from the backend to automatically be updated. Either that or the backend is pushin g to the frontend.
We need to study whats the best for us, the easiest and cleanest.
The new frontend page I want will do nothing except display the current situation. The website will be public so everybody can see the current situation.
The frontend will display the llm in a cool fun way having like their round.
We will see them in some type of circle with a way to see who's the master of the round, who's the current llm in play that is either talking/answering or judging depending on which step we are.
We see the name of the llm. We can see the current question in play with the current topic of question.
We can see who's already talk/judge and if we click on the llm in question we see their answer/ranking and thinking process.
We need to think a lot about what the cleanest ui/ux for this. I want it to be best practice and use nice library and be DRY and SOLID and KISS.
We want here to think about having a design that is slick and NOT what AI usually do so take time for this step to browse what are the giveaway that a design comes from an ai coding agent. Then once you have everything you will be able to know what you want to create for this frontend.


The end result is a board of AI that question themselves and rank themselves.
We need to be able to have an admin section to enable /disable model easily.
To also edit prompt we will send to AI from the master of a turn to the llm answering and all.

-------------
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







