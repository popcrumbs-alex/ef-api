const { default: axios } = require("axios");
const express = require("express");
const router = express.Router();

//@route GET
//@desc Grab data from click funnels webhook
//@access private
router.post("/", async (req, res) => {
    // console.log("data", req.headers);
    const currentDate = new Date();
    const utcDate = currentDate.toISOString() + " UTC"
    req.headers["content-type"] = "application/json";
    req.headers["X-Clickfunnels-Webhook-Delivery-Id"] =
        process.env.CF_DELIVERY_ID;
    req.headers["payload"] = { "time": utcDate }


    try {
        // console.log("cf-data", data);
        const { contact, purchase } = req.body

        // const { type, attributes } = data;

        console.log('type:', "contact: ", contact ? 'contact event' : '', "purchase: ", purchase)
        if (contact) {
            console.log('contact event,returning from webhook')
            return res.status(200).json({ msg: 'Do not care about this event :(' })
        }

        const { products } = purchase

        const productAmount = products.reduce((total, product) => {
            return total + parseFloat(product?.amount?.cents)
        }, 0)

        const formattedAmount = (productAmount / 100).toFixed(2);


        console.log('product amount', formattedAmount);

        const { aff_sub } = purchase.contact

        if (!aff_sub) {
            console.log('No affiliate id associated with purchase')
            return res.status(200).json({ msg: 'No affiliate id associated with purchase' })
        }
        console.log("affiliate sub id", aff_sub)
        const response = await axios({
            url: `https://www.poptrkr.com/?nid=577&transaction_id=${aff_sub}&amount=${formattedAmount}`,
            method: "POST",
            headers: {
                "content-type": 'application/json',
                "X-Eflow-API-Key": process.env.EF_API
            },
        })

        console.log('response to webhook', response.data)

        return res.status(200).json(response.data);
    } catch (error) {
        console.error("ERROR:", error);
        return res.status(500).json({ msg: "Uh Oh" });
    }
});

//@route post route
//@desc post a conversion
//@access private
router.post("/conversion", async (req, res) => {
    try {
        const response = await axios({
            url: "https://www.poptrkr.com/?nid=577&transaction_id=fb356898be7440bbb5436571fd83fdae&amount=39.00",
            method: "POST",
            headers: {
                "content-type": 'application/json',
                "X-Eflow-API-Key": process.env.EF_API
            },
        })

        console.log(response.data)
        return res.status(200).json(response.data)
    } catch (error) {
        console.log('Error locating affiliates', error)
        return res.status(500).json({ msg: 'Internal Server Error' })
    }
})

//@route get route
//@desc get all offers
//@access private
router.get('/offers', async (req, res) => {
    try {
        const response = await axios({
            url: "https://api.eflow.team/v1/advertisers/offers",
            method: 'GET',
            headers: {
                "content-type": 'application/json',
                "X-Eflow-API-Key": "nVIQHQpXQMCt88ROIO3pTA"
            }
        })

        console.log('response : ', response.data);

        res.json(response.data)
    } catch (error) {
        console.error("error fetching offers");
        res.status(500).json(error)
    }
})

module.exports = router;
