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

        const { purchase, event } = req.body

        if (!purchase) return res.status(200).send({ msg: 'Not a purchase event' });

        console.log('type:', event, "purchase: ", purchase);

        const { products, status, error_message, contact } = purchase

        const productAmount = products.reduce((total, product) => {
            return total + parseFloat(product?.amount?.cents)
        }, 0)

        console.log('contact info', contact, "CONTACT UPSELL:", contact.upsell)

        const formattedAmount = (productAmount / 100).toFixed(2);

        console.log('product amount', formattedAmount, status, error_message);
        //handle cards being declined
        if (status === 'failed') {
            console.log(error_message)
            return res.status(200).json(error_message)
        }

        const { aff_sub } = purchase.contact

        if (!aff_sub) {
            console.log('No affiliate id associated with purchase')
            return res.status(200).json({ msg: 'No affiliate id associated with purchase' })
        }
        console.log("affiliate sub id", aff_sub)

        const url = !contact.upsell ? `https://www.poptrkr.com/?nid=577&transaction_id=${aff_sub}&amount=${formattedAmount}` : `https://www.poptrkr.com/?nid=577&aid=6&adv_event_id=7&transaction_id=${aff_sub}&amount=${formattedAmount}`

        const response = await axios({
            url,
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
