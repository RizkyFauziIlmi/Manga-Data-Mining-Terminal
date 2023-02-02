import prompts from "prompts"
import cheerio from 'cheerio'
import fs from 'fs'
import json2csv from 'json2csv'
import client from "../../utils/customAxios.js"
import baseUrl from "../constant/url.js"

const files = fs.readdirSync('./src/data/chapters');

const getLastPage = async (totalTasks = "3") => {
    let lastPage = ""

    process.stdout.write(`🔍 [1/${totalTasks}] fetching total number of pages...`)
    const mainPage = await client.get(`/daftar-manga`)

    if (mainPage.status === 200) {
        const element = cheerio.load(mainPage.data)
        lastPage = element('.page-numbers').text().replace("123", "").replace("…", "").replace('Berikutnya »', "")

    }

    console.log(" ✅\n");
    return lastPage
}

const getAllEndpoint = async (startPage = 1, totalPage = 168, totalTasks = "4") => {
    let allEndpoint = []

    console.log(`🔍 [2/${totalTasks}] fetching all endpoints in ${totalPage} pages...`)

    for (let i = startPage; i <= parseInt(totalPage); i++) {
        let url = i < 2 ? '/daftar-manga/' : `/daftar-manga/page/${i}/`
        const response = await client.get(url)
        if (response.status === 200) {
            const $ = cheerio.load(response.data)
            let endpoint

            $(".film-list > .animepost").each((index, el) => {
                endpoint = $(el).find(".animposx > a").attr("href").replace(`${baseUrl}/komik/`, "").replace("/", "")

                allEndpoint.push({
                    endpoint
                })
            })

            console.clear()
            let progress = (i / parseInt(totalPage)) * 100
            console.log("-Mining Comic List-\n\n")
            console.log(`🔍 [1/${totalTasks}] Fetching total number of pages...✅\n`)
            process.stdout.write(`🔍 [2/${totalTasks}] Fetching all endpoints in ${totalPage} pages...`)
            if (i === parseInt(totalPage)) {
                console.log('✅')
            } else {
                console.log('')
            }
            console.log(`💻 successfully mined endpoints in page [${i}/${totalPage}] ${progress.toFixed(2)}%\n`)
        }
    }

    return allEndpoint
}

const Mining = {
    comicListMining: async () => {
        let data = []

        console.clear()
        console.log("-Mining Comic List-\n\n")
        let lastPage = await getLastPage()

        console.log(`⛏️ [2/3] doing data mining totaling ${lastPage} pages...`)

        for (let i = 1; i <= parseInt(lastPage); i++) {
            let url = i < 2 ? '/daftar-manga/' : `/daftar-manga/page/${i}/`
            const response = await client.get(url)
            if (response.status === 200) {
                const $ = cheerio.load(response.data)
                let thumb, title, score, warna, endpoint, type

                $(".animepost").each((index, el) => {
                    thumb = $(el).find("img").attr("src")
                    title = $(el).find(".tt").text().trim()
                    score = $(el).find('.rating > i').text()
                    warna = $(el).find(".warnalabel").text().trim() === "Warna" ? true : false
                    type = $(el).find(".limit > span").attr("class").replace('typeflag ', "")
                    endpoint = $(el).find("a").attr("href").replace(`${baseUrl}/komik/`, "").replace("/", "")

                    data.push({
                        title,
                        thumb,
                        score,
                        warna,
                        type,
                        endpoint
                    })
                })

                console.clear()
                let progress = (i / parseInt(lastPage)) * 100
                console.log("-Mining Comic List-\n\n")
                console.log(`🔍 [1/3] fetching total number of pages...✅\n`)
                process.stdout.write(`⛏️ [2/3] data mining in page ${i}...`)
                if (i === parseInt(lastPage)) {
                    console.log('✅')
                } else {
                    console.log('')
                }
                console.log(`💻 successfully mined [${i}/${lastPage}] pages ${progress.toFixed(2)}%\n`)
            }
        }

        const directoryType = await prompts({
            type: "select",
            name: "value",
            message: "how will you save the file?",
            choices: [
                { title: "Default", description: "it will be saved in the current directory", value: "default" },
                { title: "Custom", description: "save the file in a specific directory", value: "custom" }
            ],
            initial: 0
        })

        const fileType = await prompts({
            type: 'multiselect',
            name: 'value',
            message: 'What type of file do you want to save?',
            choices: [
                { title: "JSON", description: "File for Database and Web App", value: "json" },
                { title: "CSV", description: "File for Microsoft Excel and Google Sheets", value: "csv" }
            ],
            max: 2,
            hint: '- Space to select. Return to submit'
        })

        console.clear()
        console.log("-Mining Comic List-\n\n")
        console.log(`🔍 [1/3] Fetching total number of pages...✅\n`)
        console.log(`⛏️ [2/3] Doing data mining totaling ${lastPage} pages...✅`)
        console.log(`💻 Successfully mined [${lastPage}/${lastPage}] pages  100%\n`)
        process.stdout.write(`💾 [3/3] Creating the file ${fileType.value.join(' and ')}...`)

        if (directoryType.value === "default") {

            await fileType.value.map(async (type) => {
                if (type === 'json') {
                    await fs.writeFile(`./src/data/komik-list.${type}`, JSON.stringify(data), (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
                if (type === 'csv') {
                    let csv = json2csv.parse(data, { fields: ['title', 'thumb', 'score', 'warna', 'type', 'endpoint'] })
                    await fs.writeFile(`./src/data/komik-list.${type}`, csv, (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
            })

            console.log(`✅ (PATH: ./src/data/komik-list.${fileType.value.join(' and ')})`)

        } else if (directoryType.value === "custom") {
            const path = await prompts({
                type: 'text',
                name: 'value',
                message: "Where will you store the data? (without file extension example: .json .csv)",
            })

            await fileType.value.map(async (type) => {
                if (type === 'json') {
                    await fs.writeFile(`${path.value}.${type}`, JSON.stringify(data), (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
                if (type === 'csv') {
                    let csv = json2csv.parse(data, { fields: ['title', 'thumb', 'score', 'warna', 'type', 'endpoint'] })
                    await fs.writeFile(`${path.value}.${type}`, csv, (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
            })

            console.log(`✅ (PATH: ${path.value}.${fileType.value.join(' dan ')})`)
        }
    },
    comicDetailsMining: async () => {
        let details = []
        let lastPage = "", allEndpoint = []

        console.clear()
        console.log("-Mining Comic Details-\n\n")
        lastPage = await getLastPage("4")

        allEndpoint = await getAllEndpoint(1, lastPage, "4")

        console.log(`⛏️ [3/4] doing data mining totaling ${allEndpoint.length} anime details...`)
        for (let i = 1; i <= allEndpoint.length; i++) {
            let url = `/komik/${allEndpoint[i - 1].endpoint}`
            const response = await client.get(url)
            if (response.status === 200) {
                const $ = cheerio.load(response.data)

                let endpoint, title, relative = [], title_ref, link_ref, thumb, score, scoredBy, rawInfo, genre = [], genre_title, genre_ref, sinopsis, teaser = [], teaser_image, similar = [], similar_image, similar_title, similar_endpoint, similar_desc, chapter_list = [], chapter_title, chapter_date, chapter_endpoint
                title = $(".entry-title").text().replace('Komik ', "")
                thumb = $(".thumb").find("img").attr("src")
                score = $(".ratingmanga").find("i").text()
                scoredBy = $(".ratingmanga").find(".votescount").text()
                $(".epsbaru > div").each((index, el) => {
                    title_ref = $(el).find(".barunew").text()
                    link_ref = $(el).find("a").attr("href").replace(`${baseUrl}/`, "").replace("/", "")

                    relative.push({
                        title_ref,
                        link_ref
                    })
                })

                rawInfo = $(".spe").text().trim().split("\n")
                rawInfo.shift()
                rawInfo.pop()

                const info = rawInfo.reduce((acc, item) => {
                    const [name, value] = item.split(':');
                    acc.push({ [name]: value });
                    return acc;
                }, []);


                $(".genre-info > a").each((i, el) => {
                    genre_title = $(el).text()
                    genre_ref = $(el).attr("href").replace("/genres/", "")

                    genre.push({
                        genre_title,
                        genre_ref
                    })
                })

                $(".spoiler > div").each((i, el) => {
                    teaser_image = $(el).find("img").attr("src")

                    teaser.push({
                        teaser_image
                    })
                })

                $(".serieslist > ul > li").each((i, el) => {
                    similar_image = $(el).find("img").attr("src")
                    similar_title = $(el).find(".leftseries > h4").text()
                    similar_endpoint = $(el).find(".leftseries > h4 > a").attr("href").replace(`${baseUrl}/komik/`, "").replace("/", "")
                    similar_desc = $(el).find(".excerptmirip").text().replace("\n", "")

                    similar.push({
                        similar_image,
                        similar_title,
                        similar_endpoint,
                        similar_desc
                    })
                })

                $("#chapter_list").find("li").each((i, el) => {
                    chapter_title = $(el).find(".lchx").find("chapter").text()
                    chapter_date = $(el).find(".dt").text()
                    chapter_endpoint = $(el).find("a").attr("href").replace(`${baseUrl}/`, "").replace("/", "")

                    chapter_list.push({
                        chapter_title,
                        chapter_date,
                        chapter_endpoint
                    })
                })

                sinopsis = $(".desc").find("p").text()
                endpoint = allEndpoint[i - 1].endpoint

                details.push({
                    title,
                    endpoint,
                    thumb,
                    score,
                    scoredBy,
                    relative,
                    info,
                    genre,
                    teaser,
                    similar,
                    chapter_list,
                    sinopsis
                })

                console.clear()
                console.log("-Mining Comic List-\n\n")
                let progress = (i / allEndpoint.length) * 100
                console.log("🔍 [1/4] Fetching total number of pages...✅\n")
                console.log(`🔍 [2/4] Fetching all endpoints in ${lastPage} pages...✅\n`)
                process.stdout.write(`⛏️ [3/4] doing data mining ${title} details...`)
                if (i === allEndpoint.length) {
                    console.log('✅')
                } else {
                    console.log('')
                }
                console.log(`💻 successfully mined [${i}/${allEndpoint.length}] comic details ${progress.toFixed(2)}%\n`)
            }
        }

        const directoryType = await prompts({
            type: "select",
            name: "value",
            message: "how will you save the file?",
            choices: [
                { title: "Default", description: "it will be saved in the current directory", value: "default" },
                { title: "Custom", description: "save the file in a specific directory", value: "custom" }
            ],
            initial: 0
        })

        const fileType = await prompts({
            type: 'multiselect',
            name: 'value',
            message: 'What type of file do you want to save?',
            choices: [
                { title: "JSON", description: "File for Database and Web App", value: "json" },
                { title: "CSV", description: "File for Microsoft Excel and Google Sheets", value: "csv" }
            ],
            max: 2,
            hint: '- Space to select. Return to submit'
        })


        console.clear()
        console.log("-Mining Comic List-\n\n")
        console.log("🔍 [1/4] Fetching total number of pages...✅\n")
        console.log(`🔍 [2/4] Fetching all endpoints in ${lastPage} pages...✅\n`)
        console.log(`⛏️ [3/4] doing data mining totaling ${allEndpoint.length} anime details...✅`)
        console.log(`💻 successfully mined endpoints in page [${lastPage}/${lastPage}] 100%\n`)

        process.stdout.write(`💾 [4/4] membuat file ${fileType.value.join(' and ')}...`)
        if (directoryType.value === "default") {

            await fileType.value.map(async (type) => {
                if (type === 'json') {
                    await fs.writeFile(`./src/data/komik-details.${type}`, JSON.stringify(details), (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
                if (type === 'csv') {
                    const csv = json2csv.parse(details, { fields: ["title", "endpoint", "thumb", "score", "scoredBy", "info", "genre", "sinopsis", "teaser", "similar", "relative", "chapter_list"] });
                    await fs.writeFile(`./src/data/komik-details.${type}`, csv, (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
            })

            console.log(`✅ (PATH: ./src/data/komik-details.${fileType.value.join(' and ')})`)

        } else if (directoryType.value === "custom") {
            const path = await prompts({
                type: 'text',
                name: 'value',
                message: "Where will you store the data? (without file extension example: .json .csv)",
            })

            await fileType.value.map(async (type) => {
                if (type === 'json') {
                    await fs.writeFile(`${path.value}.${type}`, JSON.stringify(details), (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
                if (type === 'csv') {
                    const csv = json2csv.parse(details, { fields: ["title", "endpoint", "thumb", "score", "scoredBy", "info", "genre", "sinopsis", "teaser", "similar", "relative", "chapter_list"] });
                    await fs.writeFile(`${path.value}.${type}`, csv, (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
            })

            console.log(`✅ (PATH: ${path.value}.${fileType.value.join(' and ')})`)
        }


    },
    comicChaptersMining: async () => {
        let chapters = []
        let chapter_list = []
        let allEndpoint = [], lastPage = ""

        console.clear()
        console.log("-Mining Comic Chapters-\n\n")
        lastPage = await getLastPage("5")

        const startPage = await prompts({
            name: 'value',
            initial: 1,
            message: "What page you want to start mining?",
            type: "number",
            min: 1,
            max: lastPage
        })

        const endPage = await prompts({
            name: 'value',
            initial: lastPage,
            message: "What page you want to end mining?",
            type: "number",
            min: 1,
            max: lastPage
        })

        allEndpoint = await getAllEndpoint(startPage.value, endPage.value, 5)

        console.log(`⛏️ [3/5] doing data mining totaling ${allEndpoint.length} chapter anime endpoint...`)


        for (let i = 1; i <= allEndpoint.length; i++) {
            let url = `/komik/${allEndpoint[i - 1].endpoint}`
            const response = await client.get(url)
            if (response.status === 200) {
                const $ = cheerio.load(response.data)

                let chapter_endpoint, title

                title = $(".entry-title").text().replace('Komik ', "")

                $("#chapter_list > ul > li").each((i, el) => {
                    chapter_endpoint = $(el).find(".lchx > a").attr("href").replace(`${baseUrl}/`, "").replace("/", "")

                    chapter_list.push({
                        chapter_endpoint
                    })
                })

                console.clear()
                console.log("-Mining Comic Chapters-\n\n")
                let progress = (i / allEndpoint.length) * 100
                console.log("🔍 [1/5] Fetching total number of pages...✅\n")
                console.log(`🔍 [2/5] Fetching all endpoints in ${lastPage} pages...✅\n`)
                process.stdout.write(`⛏️ [3/5] doing data mining ${title} chapters endpoint...`)
                if (i === allEndpoint.length) {
                    console.log('✅')
                } else {
                    console.log('')
                }
                console.log(`💻 successfully mined [${i}/${allEndpoint.length}] comics chapter endpoint ${progress.toFixed(2)}%\n`)
            }
        }

        for (let i = 1; i <= chapter_list.length; i++) {
            let url = `/${chapter_list[i - 1].chapter_endpoint}`
            const response = await client.get(url)

            if (response.status === 200) {
                const $ = cheerio.load(response.data)

                let title, images = [], image_link, image_alt, relativeRaw = [], relative_title, relative_endpoint, endpoint

                endpoint = chapter_list[i - 1].chapter_endpoint
                title = $(".entry-title").text()

                $("#chimg-auh > img").each((i, el) => {
                    image_link = $(el).attr("src")
                    image_alt = $(el).attr("alt")

                    images.push({
                        image_link,
                        image_alt
                    })
                })

                $(".nextprev").first().find("a").each((i, el) => {
                    relative_title = $(el).text().trim()
                    relative_endpoint = $(el).attr("href").replace(`${baseUrl}/`, "").replace("komik/", "").replace("/", "")

                    relativeRaw.push({
                        relative_title,
                        relative_endpoint
                    })
                })

                let relative = relativeRaw.filter((val, index) => {
                    return val.relative_title !== "Download Chapter"
                })

                chapters.push({
                    endpoint,
                    title,
                    relative,
                    images
                })

                console.clear()
                console.log("-Mining Comic Chapters-\n\n")
                let progress = (i / chapter_list.length) * 100
                console.log("🔍 [1/5] Fetching total number of pages...✅\n")
                console.log(`🔍 [2/5] Fetching all endpoints in ${lastPage} pages...✅\n`)
                console.log(`⛏️ [3/5] doing data mining ${allEndpoint.length} comic chapters endpoint...✅`)
                process.stdout.write(`⛏️ [4/5] doing data mining ${chapter_list[i - 1].chapter_endpoint} images...`)
                if (i === chapter_list.length) {
                    console.log('✅')
                } else {
                    console.log('')
                }
                console.log(`💻 successfully mined [${i}/${chapter_list.length}] comic details ${progress.toFixed(2)}%\n`)
            }
        }



        const directoryType = await prompts({
            type: "select",
            name: "value",
            message: "how will you save the file?",
            choices: [
                { title: "Default", description: "it will be saved in the current directory", value: "default" },
                { title: "Custom", description: "save the file in a specific directory", value: "custom" }
            ],
            initial: 0
        })

        const fileType = await prompts({
            type: 'multiselect',
            name: 'value',
            message: 'What type of file do you want to save?',
            choices: [
                { title: "JSON", description: "File for Database and Web App", value: "json" },
                { title: "CSV", description: "File for Microsoft Excel and Google Sheets", value: "csv" }
            ],
            max: 2,
            hint: '- Space to select. Return to submit'
        })

        console.clear()
        console.log("-Mining Comic Chapters-\n\n")
        console.log("🔍 [1/5] Fetching total number of pages...✅\n")
        console.log(`🔍 [2/5] Fetching all endpoints in ${lastPage} pages...✅\n`)
        console.log(`⛏️ [3/5] doing data mining ${allEndpoint.length} comic chapters endpoint...✅`)
        console.log(`⛏️ [4/5] doing data mining ${chapter_list.length} chapters images...✅`)

        process.stdout.write(`💾 [5/5] membuat file ${fileType.value.join(' and ')}...`)
        if (directoryType.value === "default") {

            await fileType.value.map(async (type) => {
                if (type === 'json') {
                    await fs.writeFile(`./src/data/komik-chapters.${type}`, JSON.stringify(chapters), (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
                if (type === 'csv') {
                    const csv = json2csv.parse(chapters, { fields: ["endpoint", "title", "relative", "images"] });
                    await fs.writeFile(`./src/data/komik-chapters.${type}`, csv, (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
            })

            console.log(`✅ (PATH: ./src/data/komik-chapters.${fileType.value.join(' and ')})`)

        } else if (directoryType.value === "custom") {
            const path = await prompts({
                type: 'text',
                name: 'value',
                message: "Where will you store the data? (without file extension example: .json .csv)",
            })

            await fileType.value.map(async (type) => {
                if (type === 'json') {
                    await fs.writeFile(`${path.value}.${type}`, JSON.stringify(chapters), (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
                if (type === 'csv') {
                    const csv = json2csv.parse(chapters, { fields: ["endpoint", "title", "relative", "images"] });
                    await fs.writeFile(`${path.value}.${type}`, csv, (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
            })

            console.log(`✅ (PATH: ${path.value}.${fileType.value.join(' and ')})`)
        }
    },
    getSpecificDetail: async () => {
        let details = []

        const title_endpoint = await prompts({
            type: 'text',
            name: 'value',
            message: 'Type title endpoint!'
        })

        let url = `/komik/${title_endpoint.value}`
        const response = await client.get(url)

        if (response.status === 200) {
            const $ = cheerio.load(response.data)

            let endpoint, title, relative = [], title_ref, link_ref, thumb, score, scoredBy, rawInfo, genre = [], genre_title, genre_ref, sinopsis, teaser = [], teaser_image, similar = [], similar_image, similar_title, similar_endpoint, similar_desc, chapter_list = [], chapter_title, chapter_date, chapter_endpoint
            title = $(".entry-title").text().replace('Komik ', "")
            thumb = $(".thumb").find("img").attr("src")
            score = $(".ratingmanga").find("i").text()
            scoredBy = $(".ratingmanga").find(".votescount").text()
            $(".epsbaru > div").each((index, el) => {
                title_ref = $(el).find(".barunew").text()
                link_ref = $(el).find("a").attr("href").replace(`${baseUrl}/`, "").replace("/", "")

                relative.push({
                    title_ref,
                    link_ref
                })
            })

            rawInfo = $(".spe").text().trim().split("\n")
            rawInfo.shift()
            rawInfo.pop()

            const info = rawInfo.reduce((acc, item) => {
                const [name, value] = item.split(':');
                acc.push({ [name]: value });
                return acc;
            }, []);


            $(".genre-info > a").each((i, el) => {
                genre_title = $(el).text()
                genre_ref = $(el).attr("href").replace("/genres/", "")

                genre.push({
                    genre_title,
                    genre_ref
                })
            })

            $(".spoiler > div").each((i, el) => {
                teaser_image = $(el).find("img").attr("src")

                teaser.push({
                    teaser_image
                })
            })

            $(".serieslist > ul > li").each((i, el) => {
                similar_image = $(el).find("img").attr("src")
                similar_title = $(el).find(".leftseries > h4").text()
                similar_endpoint = $(el).find(".leftseries > h4 > a").attr("href").replace(`${baseUrl}/komik/`, "").replace("/", "")
                similar_desc = $(el).find(".excerptmirip").text().replace("\n", "")

                similar.push({
                    similar_image,
                    similar_title,
                    similar_endpoint,
                    similar_desc
                })
            })

            $("#chapter_list").find("li").each((i, el) => {
                chapter_title = $(el).find(".lchx").find("chapter").text()
                chapter_date = $(el).find(".dt").text()
                chapter_endpoint = $(el).find("a").attr("href").replace(`${baseUrl}/`, "").replace("/", "")

                chapter_list.push({
                    chapter_title,
                    chapter_date,
                    chapter_endpoint
                })
            })

            sinopsis = $(".desc").find("p").text()
            endpoint = title_endpoint.value

            details.push({
                title,
                endpoint,
                thumb,
                score,
                scoredBy,
                relative,
                info,
                genre,
                teaser,
                similar,
                chapter_list,
                sinopsis
            })

            console.clear()
            console.log("-Mining Comic List-\n\n")
            process.stdout.write(`⛏️ [3/4] doing data mining ${title} details...`)
        }

        const directoryType = await prompts({
            type: "select",
            name: "value",
            message: "how will you save the file?",
            choices: [
                { title: "Default", description: "it will be saved in the current directory", value: "default" },
                { title: "Custom", description: "save the file in a specific directory", value: "custom" }
            ],
            initial: 0
        })

        const fileType = await prompts({
            type: 'multiselect',
            name: 'value',
            message: 'What type of file do you want to save?',
            choices: [
                { title: "JSON", description: "File for Database and Web App", value: "json" },
                { title: "CSV", description: "File for Microsoft Excel and Google Sheets", value: "csv" }
            ],
            max: 2,
            hint: '- Space to select. Return to submit'
        })

        process.stdout.write(`💾 [4/4] membuat file ${fileType.value.join(' and ')}...`)
        if (directoryType.value === "default") {

            await fileType.value.map(async (type) => {
                if (type === 'json') {
                    await fs.writeFile(`./src/data/${title_endpoint.value.replace('/', '')}-details.${type}`, JSON.stringify(details), (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
                if (type === 'csv') {
                    const csv = json2csv.parse(details, { fields: ["title", "endpoint", "thumb", "score", "scoredBy", "info", "genre", "sinopsis", "teaser", "similar", "relative", "chapter_list"] });
                    await fs.writeFile(`./src/data/${title_endpoint.value.replace('/', '')}-details.${type}`, csv, (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
            })

            console.log(`✅ (PATH: ./src/data/${title_endpoint.value.replace('/', '')}-details.${fileType.value.join(' and ')})`)

        } else if (directoryType.value === "custom") {
            const path = await prompts({
                type: 'text',
                name: 'value',
                message: "Where will you store the data? (without file extension example: .json .csv)",
            })

            await fileType.value.map(async (type) => {
                if (type === 'json') {
                    await fs.writeFile(`${path.value}.${type}`, JSON.stringify(details), (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
                if (type === 'csv') {
                    const csv = json2csv.parse(details, { fields: ["title", "endpoint", "thumb", "score", "scoredBy", "info", "genre", "sinopsis", "teaser", "similar", "relative", "chapter_list"] });
                    await fs.writeFile(`${path.value}.${type}`, csv, (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
            })

            console.log(`✅ (PATH: ${path.value}.${fileType.value.join(' and ')})`)
        }
    },
    getSpecificChapters: async () => {
        let chapters = []
        let chapter_list = []

        const titleEndpoint = await prompts({
            type: 'text',
            name: 'value',
            message: "Type Title Endpoint!"
        })

        let url = `/komik/${titleEndpoint.value}`
        const response = await client.get(url)
        if (response.status === 200) {
            const $ = cheerio.load(response.data)

            let chapter_endpoint, title

            title = $(".entry-title").text().replace('Komik ', "")

            $("#chapter_list > ul > li").each((i, el) => {
                chapter_endpoint = $(el).find(".lchx > a").attr("href").replace(`${baseUrl}/`, "").replace("/", "")

                chapter_list.push({
                    chapter_endpoint
                })
            })

            console.clear()
            console.log("-Mining Comic Chapters-\n\n")
            process.stdout.write(`⛏️ [3/5] doing data mining ${title} chapters endpoint...`)
        }


        for (let i = 1; i <= chapter_list.length; i++) {
            let url = `/${chapter_list[i - 1].chapter_endpoint}`
            const response = await client.get(url)

            if (response.status === 200) {
                const $ = cheerio.load(response.data)

                let title, images = [], image_link, image_alt, relativeRaw = [], relative_title, relative_endpoint, endpoint

                endpoint = chapter_list[i - 1].chapter_endpoint
                title = $(".entry-title").text()

                $("#chimg-auh > img").each((i, el) => {
                    image_link = $(el).attr("src")
                    image_alt = $(el).attr("alt")

                    images.push({
                        image_link,
                        image_alt
                    })
                })

                $(".nextprev").first().find("a").each((i, el) => {
                    relative_title = $(el).text().trim()
                    relative_endpoint = $(el).attr("href").replace(`${baseUrl}/`, "").replace("komik/", "").replace("/", "")

                    relativeRaw.push({
                        relative_title,
                        relative_endpoint
                    })
                })

                let relative = relativeRaw.filter((val, index) => {
                    return val.relative_title !== "Download Chapter"
                })

                chapters.push({
                    endpoint,
                    title,
                    relative,
                    images
                })

                console.clear()
                console.log("-Mining Comic Chapters-\n\n")
                let progress = (i / chapter_list.length) * 100
                process.stdout.write(`⛏️ [4/5] doing data mining ${chapter_list[i - 1].chapter_endpoint} images...`)
                if (i === chapter_list.length) {
                    console.log('✅')
                } else {
                    console.log('')
                }
                console.log(`💻 successfully mined [${i}/${chapter_list.length}] comic details ${progress.toFixed(2)}%\n`)
            }
        }

        const directoryType = await prompts({
            type: "select",
            name: "value",
            message: "how will you save the file?",
            choices: [
                { title: "Default", description: "it will be saved in the current directory", value: "default" },
                { title: "Custom", description: "save the file in a specific directory", value: "custom" }
            ],
            initial: 0
        })

        const fileType = await prompts({
            type: 'multiselect',
            name: 'value',
            message: 'What type of file do you want to save?',
            choices: [
                { title: "JSON", description: "File for Database and Web App", value: "json" },
                { title: "CSV", description: "File for Microsoft Excel and Google Sheets", value: "csv" }
            ],
            max: 2,
            hint: '- Space to select. Return to submit'
        })

        if (directoryType.value === "default") {

            await fileType.value.map(async (type) => {
                if (type === 'json') {
                    await fs.writeFile(`./src/data/${titleEndpoint.value}-chapter.${type}`, JSON.stringify(chapters), (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
                if (type === 'csv') {
                    const csv = json2csv.parse(chapters, { fields: ["endpoint", "title", "relative", "images"] });
                    await fs.writeFile(`./src/data/${titleEndpoint.value}-chapter.${type}`, csv, (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
            })

            console.log(`✅ (PATH: ./src/data/${titleEndpoint.value}-chapter.${fileType.value.join(' and ')})`)

        } else if (directoryType.value === "custom") {
            const path = await prompts({
                type: 'text',
                name: 'value',
                message: "Where will you store the data? (without file extension example: .json .csv)",
            })

            await fileType.value.map(async (type) => {
                if (type === 'json') {
                    await fs.writeFile(`${path.value}.${type}`, JSON.stringify(chapters), (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
                if (type === 'csv') {
                    const csv = json2csv.parse(chapters, { fields: ["endpoint", "title", "relative", "images"] });
                    await fs.writeFile(`${path.value}.${type}`, csv, (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
            })

            console.log(`✅ (PATH: ${path.value}.${fileType.value.join(' and ')})`)
        }
    },
    mergeChapters: async () => {
        const jsonData = {};
        let processedFiles = 0;
        files.forEach((file) => {
            const content = fs.readFileSync(`./src/data/chapters/${file}`, 'utf8');
            jsonData[file.replace('.json', '')] = JSON.parse(content);
            processedFiles++;
            let process = processedFiles / files.length * 100
            console.clear()
            console.log(`${files.length}/${processedFiles} ${process.toFixed(2)}%`)
        });
        const jsonString = JSON.stringify(jsonData);
        fs.writeFileSync('./src/data/allChapters.json', jsonString);
        fs.writeFile('./src/data/allChapters.json', jsonString, (err) => {
            if (err) throw err;
            console.log('The file has been saved!');
        });

    }
}

export default Mining