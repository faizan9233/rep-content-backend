import express from 'express'
import { adminOnly, protect  } from '../middleware/auth.middleware.js';
import { deleteUser, editUserRole, inviteUser } from '../controller/main.controller.js';


const adminRouter = express.Router();

adminRouter.post('/edit-role',protect,adminOnly,editUserRole)
adminRouter.delete('/delete-user/:id',protect,adminOnly,deleteUser)
adminRouter.post('/invite-user',protect,adminOnly,inviteUser)

export default adminRouter;