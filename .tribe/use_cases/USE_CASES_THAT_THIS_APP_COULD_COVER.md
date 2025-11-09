imagine this, you work as research assistant, assistant to CEO, growth, SDR, marketing, anything that is more social than engineering but you are required to use `ai tricks`

and?

copy and paste to chatgpt gets tedious.
copy and paste to perplexity makes you insane.

This week we could help with:

- too complex example: website url -> top keywords -> conferences related to the website url -> speakers/atendees -> @ or LinkedIn contact details
- manageable example: input csv with company names -> company name -> use google search to find website url -> use google search and website url to find relevant pages -> use url context to fetch data -> use structured output generation to extract into structured json(named clusters -> json enum, any of, many of, some of -> weighted score) -> apply search filters -> export csv
- manageable: upload research reports about websites (json files, one row = one json) -> extract structured data (classify, score)

so, those examples are using gemini to: create new columns with data. some of them fetch for new informations like google search or particular website urls.

the main purpose is to use internet as the database and get from it whatever user wants with ai.

user should be able to negotiate/talk with the agent that will generate the json.

that json should be used to generate spreadsheet

then user should be able to upload the csv with data

adding rows to the csv should be possible with the GUI Form, API, Webhook.
finished rows should send webhook
finished table could send the notification.

we need an interface that will somehow add configs. then something to convert configs into spreadsheets. this should be connected with @schema.ts.

see /sheets/[id]/page.tsx to understand more.