const express = require("express");
const dogs = require("../dogData");
const { ValidationError, NotFoundError } = require("../errors");

const router = express.Router();

router.get("/dogs", (req, res) => {
  res.status(200).json(dogs);
});

router.post("/adopt", (req, res, next) => {
  const { name, address, email, dogName } = req.body;

  // OPTIONAL Task 18: check required fields (address is optional).
  if (!name || !email || !dogName) {
    return next(
      new ValidationError("Missing required fields: name, email, and dogName"),
    );
  }

  // The dog must exist AND have status "available" (Max is "pending").
  const dog = dogs.find((d) => d.name === dogName && d.status === "available");
  if (!dog) {
    return next(
      new NotFoundError(`Dog "${dogName}" not found or not available`),
    );
  }

  res.status(201).json({
    message: `Adoption request received. We will contact you at ${email} for further details.`,
    application: {
      name,
      address,
      email,
      dogName,
      applicationId: Date.now(),
    },
  });
});

router.get("/error", (req, res, next) => {
  next(new Error("Test error"));
});

module.exports = router;
