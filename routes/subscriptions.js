const express = require("express");
const router = express.Router();
const stripe = require("stripe")(
  process.env.NODE_ENV === "development"
    ? process.env.STRIPE_TEST_SECRET
    : process.env.STRIPE_LIVE_SECRET
);
//@route GET route
//@desc Get a subscription once created
//@access private
router.post("/slick/subscriptions", async (req, res) => {
  const { data } = req.body;
  //   console.log("data?", data.object);
  //1. get notified a sub was created in clickfunnels
  //2. grab that customer in stripe
  //3. update the subscription price to the $28.00 a month recurring charge price
  //4. Not sure if needed yet
  try {
    const foundStripeCustomer = await stripe.customers.retrieve(
      data.object.customer || ""
    );
    if (!foundStripeCustomer) {
      return res.status(200).send({ msg: "No stripe customer!" });
    }

    const customerSubscriptions = foundStripeCustomer.subscriptions || null;

    // console.log("customer svufdsf", customerSubscriptions);
    if (!customerSubscriptions) {
      console.log(" no sub found on customer");
      return res.status(200).send({ msg: "No subscription on found customer" });
    }

    const subs = await Promise.all(
      foundStripeCustomer.subscriptions.data.map(async (sub) => {
        const foundSub = await stripe.subscriptions.retrieve(sub.id);

        return foundSub;
      })
    );

    const subItems = subs.map((sub) => sub.items).map((subItem) => subItem);

    const foundProducts = await Promise.all(
      subItems
        .filter(async (item) => {
          const foundItem = await stripe.products.retrieve(
            item.data[0].plan.product
          );

          return foundItem.name.toLowerCase() === "slick lash club 28";
        })
        .map(async (product) => {
          const updatedSub = await stripe.subscriptions.update(
            product.data[0].subscription,
            {
              cancel_at_period_end: false,
              proration_behavior: "none",
              items: [
                {
                  id: product.data[0].id,
                  price: "price_1JDD6dJ0FvsBsG7afI2fBIUs",
                },
              ],
            }
          );
          return updatedSub;
        })
    );

    console.log("found products", foundProducts);
    res.status(200).send({ msg: "SDFSFSDFSF" });
  } catch (error) {
    console.error("error!", error);
    res.status(200).send(error);
  }
});

module.exports = router;
