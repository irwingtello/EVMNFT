const express = require('express');
const axios = require('axios');
require('dotenv').config();
const {
  InteractionType,
  InteractionResponseType,
  verifyKeyMiddleware
} = require('discord-interactions/dist');
const  ethers  = require("ethers");
const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN;
const QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_URL;
const CLIENT_PUBLIC_KEY = process.env.CLIENT_PUBLIC_KEY;
app.post('/interactions', verifyKeyMiddleware(CLIENT_PUBLIC_KEY), async (req, res) => {
  const message = req.body;

  if (message.type === InteractionType.APPLICATION_COMMAND) {
    try{
        const wallet = message.data.options[0].value;

        const body = {
          wallet:wallet,
          channel_id: message.channel_id
        };
        console.log(message.channel_id);
        const config = {
          headers: {
            'Content-Type': 'application/json'
          }
        };

        switch (message.data.name.toLowerCase()) {
          case 'retrieve':
              axios.post(`https://${req.headers.host}/retrieve`, body, config);

              res.status(200).send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: 'We are working for you :)'
                }
              });
            
            break;
          case 'info':
            axios.post(`https://${req.headers.host}/info`, body, config);

            res.status(200).send({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: 'We are working for you :)'
              }
            });
            break;
          default:
            await sendErrorMessage(message.channel_id);
            break;
        }
     }
    catch (error) {
      await sendErrorMessage(message.channel_id);
    }
  } else {
    await sendErrorMessage(message.channel_id);
  }
});

app.post('/retrieve',express.json(), async (req, res) => {
  const { wallet,  channel_id } = req.body;
  try {
   await getNFTBalance(channel_id,wallet);

    res.status(200).send({
      data: {
        content: 'OK'
      }
    });
  } catch (error) {
    await sendErrorMessage(channel_id);
  }
});
async function getNFTBalance(channel_id,ownerAddress) {
  const provider = new ethers.JsonRpcProvider(QUICKNODE_RPC_URL);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, [
    'function balanceOf(address) external view returns (uint256)',
    'function totalSupply() external view returns (uint256)',
    'function tokenOfOwnerByIndex(address,uint256) external view returns (uint256)',
    'function tokenURI(uint256) external view returns (string)',
  ], provider);
  try {
    const balance = await contract.balanceOf(ownerAddress);
    console.log("Balance:" + balance);
    let embeds = [];  
    let page=1;
    for (let i = 0; i < balance; i++) {
      let tokenOfOwnerByIndex = parseInt(await contract.tokenOfOwnerByIndex(ownerAddress, i));
      let tokenURI = await contract.tokenURI(tokenOfOwnerByIndex);
      let tokenURIModified = tokenURI.replace('ipfs://', 'https://nftstorage.link/ipfs/'); 
      try {
          let response = await axios.get(tokenURIModified);
          let name= response.data?.name?response.data?.name:"No name,this metadata doesn't follow the standard";
          let description= response.data?.description?response.data?.description:"No description,this metadata doesn't follow the standard";
          let image = response.data?.image ? (response.data?.image.startsWith("https://") ? response.data?.image: "https://ipfs.io/ipfs/bafkreigbzfovprwjdzhvbfmh3n5j4nidaqi455bvomy4kpg2jjvi6b4geq") : "https://ipfs.io/ipfs/bafkreigbzfovprwjdzhvbfmh3n5j4nidaqi455bvomy4kpg2jjvi6b4geq";

          embeds.push({
            title: name,
            description: description,
            color: 3683171,
            image:{url:image.toString()}
          });

          if (i !== 0 && (i % 8 === 0)) {
            let messageData = {
              content: "Page: "+ page.toString() ,
              embeds:embeds
            };
            embeds=[];
            await sendMessage(channel_id, messageData);
            page++;
          }
          else
          {         
            if ((i+1) == balance) {
              let messageData = {
                content: "Page: "+ page.toString() ,
                embeds:embeds
              };
                embeds=[];
                await sendMessage(channel_id, messageData);
                page++;
            }
          }
        } catch (axiosError) {
          let name= "No name,this metadata doesn't follow the standard";
          let description="No description,this metadata doesn't follow the standard";
          let image = "https://ipfs.io/ipfs/bafkreigbzfovprwjdzhvbfmh3n5j4nidaqi455bvomy4kpg2jjvi6b4geq";
          embeds.push({
            title: name,
            description: description,
            image:{url:image.toString()}
          });

        }
    }
   
  } catch (error) {
    console.error("Error:", error);
  }
}
async function getNFTAmount(channel_id,ownerAddress) {
  const provider = new ethers.JsonRpcProvider(QUICKNODE_RPC_URL); // Replace with your Ethereum node URL
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, [
    'function balanceOf(address) external view returns (uint256)',
  ], provider);
  try {
    const balance = await contract.balanceOf(ownerAddress);
    const messageData = {
      content: 'Built by irwing@dfhcommunity.com',
      embeds: [
        {
          title:'This portfolio has ' + balance + ' NFTs',
          color: 3683171,
        }
      ]
    };
    
    await sendMessage(channel_id, messageData);
    console.log(`NFT balance for ${ownerAddress}: ${balance}`);
  } catch (error) {
    console.error("Error:", error);
  }
}



app.post('/info',express.json(), async (req, res) => {
  const { wallet, channel_id } = req.body;
  try {

    await getNFTAmount(channel_id,wallet);


    res.status(200).send({
      data: {
        content: 'OK'
      }
    });
  } catch (error) {
    await sendErrorMessage(channel_id);
  }
});

async function sendErrorMessage(channelId) {
  const messageData = {
    content: 'Built by irwing@dfhcommunity.com',
    embeds: [
      {
        title: 'Houston we have a problem :(',
        description: 'No information available'
      }
    ]
  };
  await sendMessage(channelId, messageData);
}

async function sendMessage(channelId, data) {
  try {
    const config = {
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    await axios.post(`https://discord.com/api/v8/channels/${channelId}/messages`, data, config);
  } catch (error) {
    //console.error('Failed to send message:', error);
  }
}

const port = 3000; // Choose a port number

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
