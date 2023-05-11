
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import   {exec} from "child_process";

import axios from "axios";
import * as fs from 'fs';

import TelegramApi from "node-telegram-bot-api";

import path from 'path';
import { log } from 'console';
import { query } from 'express';
import { escape } from 'querystring';

const token = "6246138220:AAG5ykunrepIlJIFcmZpLNghefB8Z9IBevw"

const bot = new TelegramApi(token, {polling: true})



bot.on('message', async (msg) => {
    try {
        if (msg.video) {
            const video = msg.video;

            const filePath = await bot.downloadFile(video.file_id, './videos');
            console.log(filePath);
            bot.sendMessage(msg.chat.id, 'Видео успешно сохранено');
            bot.sendMessage(msg.chat.id, 'Подождите, модель обучается 📝');

            videoToImg(ffmpeg, filePath, fs, msg.chat.id,bot)
            //удалить потоммм
            // sendFotoElse(msg.chat.id);
        } else {
            bot.sendMessage(msg.chat.id, 'Пожалуйста, отправьте видео');
            sendFotoElse(msg.chat.id);
        }
        } catch (error) {
            console.log("Error: " + error);
            bot.sendMessage(msg.chat.id, 'Произошла ошибка');
        }
    }
)

//ffmpeg
const videoToImg = (ffmpeg, filePath, fs, chatId,bot)=>{
    ffmpeg.setFfmpegPath(ffmpegStatic);
//проверка на MOV add
    ffmpeg()
        
        .input(filePath)

        // .outputOptions('-vf', "select=not(mod(n\,10))", '-vsync', 'vfr')
        // .fps(3)
        // .saveToFile('../resize_512/input/frame-%03d.png')


        .screenshots({
            count: 15,
            folder: '../../resize_512/input/'
        })

        .on('progress', (progress) => {
            if (progress.percent) {
            console.log(`Processing: ${Math.floor(progress.percent)}% done`);
            }
        })

        .on('end', () => {
            console.log('Фото полученно');
            resizeFotos(fs,chatId,bot)
                .then(()=>{
                // setTimeout(() =>runNet(fs,chatId,bot) , 10000);
                
            })
                
        })
        .on('error', (error) => {
            console.error(error);
        });
        
}
//resize
// const promise = new Promise(function(resolve, reject) {
//     resizeFotos()
//   });

async function  resizeFotos (fs,chatId,bot)  {
    exec("conda activate faceRecognition && python D:/resize_512/im.py && rembg p  D:/resize_512/output D:/resize_512/50_output/50_output", (error, stdout, stderr) => {
        // console.log("command", command);
        if (error) {
            console.log(`error: ${error.message}`);
            console.log('Запуск Lora');
            runNet(fs,chatId,bot) 
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            console.log('Запуск Lora');
            runNet(fs,chatId,bot) 
            return;
        }
        console.log(`stdout: ${stdout}`);

    });
}

//net
const runNet =(fs,chatId,bot)=>{
    let folderOfImg = "D:/resize_512/50_output",
    folderToSave= "D:/stable-diffusion-portable-main/models/Lora",
    size = "512,512",
    precision = "bf16",
    nameSaveModel =`MODEL-${chatId}`,

    promptAll = ` <lora:MODEL-${chatId}:0.8>a man `;

    // try {
    //     fs.moveSync("D:/resize_512/100_output", "D:/RomanW/100_output/100_output", { overwrite: true})
    //     console.log('move success!')
    // } catch (err) {
    // console.error(err)
    // }


    setTimeout(()=>{
        fs.access("D:/stable-diffusion-portable-main/models/Lora/sample", function(error) {
            if (error) {
                console.log("sample does not exist.")
            } else {
                fs.rmdir('D:/stable-diffusion-portable-main/models/Lora/sample', err => {
                    if(err) throw err; 
                })
                console.log("sample dir - delete");
            }
        })
    }, 10000)

    ffmpeg.setFfmpegPath(ffmpegStatic);


try {
    fetch(" http://127.0.0.1:7860/run/predict", {
        method: "post",
        headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        },
        // timeout: 2000,
        signal: AbortSignal.timeout(999000),

        body: JSON.stringify(
        
        {"fn_index":79,
        "data":[
            {"label":"False"},
            "D:/stable-diffusion-portable-main/models/Stable-diffusion/deliberate_v2.safetensors",
            false,
            false,
            "",
            folderOfImg,
            "",
            folderToSave,
            size,
            "0.0001",
            "constant",
            "0"
            ,2,1,1,
            precision,precision,
            "1",2,true,"",false,false,false,false,0,true,
            "safetensors",false,false,"",1,
            "5e-5","0.0001",128,"",false,false,2,1,false,
            nameSaveModel,
            "custom","75","","1",128,"","0","","",false,true,false,64,0,0,
            "AdamW8bit","","","Standard",1,1,0,0,"euler_a","","",0,0,"","","","","","","","",false, //22
            1,0,0,0], //4
            "event_data":null,
            "session_hash":"imkzfje429"}

        ),
        }).then((response) => {
            console.log('status', response.status);
            if( response.status == 200){
                SDapi(promptAll, chatId, "none").then(console.log("фото готово"))
                
                deleteDirOfFoto("D:/resize_512/50_output/50_output");
                deleteDirOfFoto("D:/resize_512/input");
                deleteDirOfFoto("D:/resize_512/output");

            }
        }).then(() =>{
            console.log("Работа окончена");
            
        });
} catch (error) {
    console.log("ОШибка в завпросе Лора: " + error);
}
    

    
}

async function  SDapi(promptAll, chatId, styleFoto){
    const request = await axios.post("http://127.0.0.1:7861/sdapi/v1/txt2img", {
            prompt: promptAll , //" <lora:50_RomanVideo:0.7> a man ",
            negative_prompt: "(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation",
            seed : -1,
            styles: [styleFoto]
        });

        let image = "" + await request.data.images;
        

        fs.writeFileSync("out.jpg",  image ,'base64', function(err) {
            console.log(err);
        });
        console.log("foto сохр");

    
        console.log("фото отослалось");
        bot.sendPhoto( chatId, 'D:/RomanW/out.jpg')
        .then(()=>{
            sendFotoElse(chatId)
        })
}
//Генер еще фото
const sendFotoElse = (chatId) =>{
    bot.sendMessage(chatId, "Сгенерить еще фото?", {
        reply_markup:{
            inline_keyboard:[
                [{
                    text: "Да",
                    callback_data: "еще"
                }]
            ]
        }
    })
}


bot.on('callback_query', quere =>{
    console.log("Ответ: "+ quere.data);
    const chatId = quere.from.id
    if ( quere.data === "еще"){
        bot.sendMessage(chatId, "В каком стиле?", {
//варианты стилей
            reply_markup:{
                inline_keyboard:[
                    [{
                        text: "Anime",
                        callback_data: "style Anime"
                    },
                    {
                        text: "Midjourney",
                        callback_data: "style Midjourney" 
                    },
                    {
                        text: "Cinematic",
                        callback_data: "style Cinematic" 
                    } 
                ],
                [
                    {
                        text: "8bit",
                        callback_data: "style 8bit" 
                    },
                    {
                        text: " Comic book",
                        callback_data: "style Comic book"
                    },
                    {
                        text: "Painting",
                        callback_data: "style Painting"
                    }
                ],
                [
                    {
                        text: "3d",
                        callback_data: "style 3d" 
                    },
                    {
                        text: "Gloomy",
                        callback_data: "style Gloomy"
                    },
                    {
                        text: "Caricature",
                        callback_data: "style Caricature"
                    }
                ]
                ]
            }
        })


        // SDapi(` <lora:MODEL-${chatId}:0.7>  a man `, chatId, )
    }else if(quere.data.split(" ")[0] == "style"){
        
        SDapi(` <lora:MODEL-${chatId}:0.8>  a man `, chatId, quere.data.replace("style ", ""))
        bot.sendMessage(chatId, "⌛ фото генериться ⌛")
    }
    else{  //,, 8k uhd, dslr, high quality, film grain, realistic, fujifilm xt3,, head closeup,
        console.log("Error callback: "+ quere.data);
    }
})

bot.on("ERROR: polling_error", console.log);


const deleteDirOfFoto = (pathOfDir) =>{
    
    fs.readdir(pathOfDir, (err, files) => {
        if (err) throw err;

        for (const file of files) {
        fs.unlink(path.join(pathOfDir, file), err => {
            if (err) throw err;
        });
        }
    });

    
}
