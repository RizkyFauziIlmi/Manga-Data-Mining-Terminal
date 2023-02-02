import prompts from "prompts"
import Mining from "./src/helper/mining.js"

const init = async () => {
    let exit = false

    console.log("DATA MINING KOMIK")

    while (!exit) {
        const option = await prompts({
            type: 'autocomplete',
            name: 'value',
            message: 'What data do you want to mine?',
            choices: [
                { title: 'Comic List', value: 'comicList' },
                { title: 'Comic Details', value: 'comicDetails' },
                { title: 'Comic Chapters', value: 'comicChapters' },
                { title: 'Comic Detail (Specific)', value: 'comicDetailSpecific' },
                { title: 'Comic Chapters (Specific)', value: 'comicChaptersSpecific' },
                { title: 'Merge Chapters', value: 'mergeChapters' },
                { title: 'Exit', value: "exit" }
            ]
        })

        if (option.value === 'exit') {
            exit = true
            console.log('the program now stops!')
        } else if (option.value === 'comicList') {
            await Mining.comicListMining()
        } else if (option.value === "comicDetails") {
            await Mining.comicDetailsMining()
        } else if (option.value === "comicChapters") {
            await Mining.comicChaptersMining()
        } else if (option.value === "mergeChapters") {
            await Mining.mergeChapters()
        } else if (option.value === "comicDetailSpecific") {
            await Mining.getSpecificDetail()
        } else if (option.value === "comicChaptersSpecific") {
            await Mining.getSpecificChapters()
        }
    }
}


init()