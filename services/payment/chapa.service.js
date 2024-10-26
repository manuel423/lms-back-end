const { Chapa } = require("chapa-nodejs");

const chapa = new Chapa({
    secretKey:
      process.env.NODE_ENV === "production"
        ? process.env.CHAPA_LIVE_SECRET
        : process.env.CHAPA_TEST_SECRET,
  });

 const generateTransacrionReference = async () =>{
    // Generate or feed your Transaction Reference
    const tx_ref = await chapa.generateTransactionReference({
     prefix: "KU", // defaults to `TX`
     size: 20, // defaults to `15`
   });
 
   return tx_ref
 }
 


// an inintializer method for chapa payment
const initialize_chapa_payment = async (data) => {
    try {  
      const response = await chapa.initialize({
        first_name: data.firstname,
        last_name: data.lastname,
        email: data.email,
        currency:data.currency,
        amount: data.total_amount,
        tx_ref: data.tx_ref,
        callback_url: data.callback_url,
        return_url: data.return_url,
        customization: {
          title: "Kegeberew",
          description: "Kegeberew University",
        },
      });
      console.log({ response });
      return response; // Assuming you want to return the response from chapa.initialize()
    } catch (error) {
      console.error("Error initializing payment:", error);
      throw error; // Rethrow the error to be handled by the caller
    }
  };

//   chapa callback
  const chapa_callback = async (req, res) => {
    try {
      const reference = req.params.reference;
  
      const order_id = req.params.order_id;
  
  
      let order =null;
  
      if (reference) {
        const data_chapa = await chapa.verify({
          tx_ref: reference,
        });
  
        if(order_id){
          order = await get_order(order_id); 
        }
  
  
  
        if (data_chapa.status === "success") {
          const data = {
            transactionID: data_chapa.data.tx_ref, // This should be a unique ID for the transaction
            response: {},
            amount: data_chapa.data.amount, // Example amount
            currency: data_chapa.data.currency, // Example currency
            paymentMethod: "Chapa", // Example payment method
            customerID: order.user,// Example customer ID
            customerName:
              data_chapa.data.first_name, // Example customer name
            emailAddress: data_chapa.data.email, // Example email address
            orderID: order_id, // Example order ID
            productDetails: "", // Example product details
            billingAddress: {
              country: "Ethiopia",
              postalCode: 1000,
              city: "AA",
              street: "Piassa",
              /* Object containing billing address */
            }, // Example billing address
            shippingAddress: {
              country: "Ethiopia",
              postalCode: 1000,
              city: "AA",
              street: "Piassa",
              /* Object containing shipping address  */
            }, // Example shipping address
            additionalMetadata: {
              /* Additional metadata if needed */
            }, // Example additional metadata
          };
  
          const payment = await save_payment(data);
  
          if (payment) {
            // Update the order         t
            if(order){
              const updated_order = await updateOrder(order_id,reference);
  
              if(order.category === 'multiple'){
                const enrolled_course = await enrollCourseForMultipleEmails(order)
              }else{
                const enrolled_course = await enrollCourse(order.orderItems[0].product, order.user)
              }
           }
          }
  
          res.status(200).json({ success: true });
        }
      } else {
        console.log({ reference: "Reference Error" });
        res.status(500).json({ success: false });
      }
    } catch (error) {
      console.log({ error });
    }
  };

  module.exports ={
    generateTransacrionReference,initialize_chapa_payment
  }