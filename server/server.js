require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const { swaggerSpec } = require('./lib/swaggerConfig');
// TODO: May be reason why logout not working

// Constants
const { 
	__prod__, 
	PORT, 
	CORS_ORIGIN 
} = require('./lib/constants');
const userSegmentRouter = require('./controllers/userSegment');

const main = async () => {
	// Initialize dependencies
	const app = express();
	// Apply middleware
	app.use(express.json());
	app.use(
		cors({
			credentials: true,
			origin: CORS_ORIGIN
		})
	);
  

app.use('/ads', express.static(path.join(__dirname, 'uploads')));
	// Swagger config
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

	require('./auth/auth');

	app.get('/', (req, res) => res.send('Welcome the My Living City API V2'));
	//app.use(express.static('/ads', express.static('uploads')));
	// Routing .js
	const userRouter = require('./controllers/user');
	const roleRouter = require('./controllers/role');
	const reportRouter = require('./controllers/report');
	const commentRouter = require('./controllers/comment');
	const blogRouter = require('./controllers/blog');
	const ideaRouter = require('./controllers/idea');
	const imageRouter = require('./controllers/image');
	const categoryRouter = require('./controllers/category');
	const ideaRatingRouter = require('./controllers/rating');
	const commentInteractRouter = require('./controllers/commentInteract');
	const championRouter = require('./controllers/champion');
	const advertisementRouter = require('./controllers/advertisement');
	const avatarRouter = require('./controllers/avatar');
	const sendEmailRouter = require('./controllers/sendEmailReset');
	const segmentRouter = require('./controllers/segment');
	const subSegmentRouter = require('./controllers/subSegment');
	const googleLocationAPI = require('./controllers/googleMap');

	const apiRouter = express.Router();
	app.use('/', apiRouter);
	apiRouter.use('/user', userRouter);
	apiRouter.use('/role', roleRouter);
	apiRouter.use('/report', reportRouter);
	apiRouter.use('/comment', commentRouter);
	apiRouter.use('/blog', blogRouter);
	apiRouter.use('/idea', ideaRouter);
	apiRouter.use('/image', imageRouter);
	apiRouter.use('/category', categoryRouter);
	apiRouter.use('/rating', ideaRatingRouter);
	apiRouter.use('/interact/comment', commentInteractRouter);
	apiRouter.use('/champion', championRouter);
	apiRouter.use('/advertisement',advertisementRouter);
	apiRouter.use('/avatar', avatarRouter);
	apiRouter.use('/sendEmail',sendEmailRouter);
	apiRouter.use('/reset-password', userRouter);
	apiRouter.use('/segment', segmentRouter);
	apiRouter.use('/subSegment',subSegmentRouter);
	apiRouter.use('/location', googleLocationAPI);
	apiRouter.use('/userSegment',userSegmentRouter);


	// Listen to server
	app.listen(PORT, console.log(`Server running on PORT:${PORT}\n\n`));
};


main().catch((error) => {
	console.log(error);
});