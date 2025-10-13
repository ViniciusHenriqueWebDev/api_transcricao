import { Op } from "sequelize";
import Ticket from "../models/Ticket";

// Agora fecha todos os tickets abertos do contato antes de criar um novo
const CheckContactOpenTickets = async (contactId: number): Promise<void> => {
  const openTickets = await Ticket.findAll({
    where: {
      contactId,
      status: { [Op.or]: ["open", "pending"] }
    }
  });

  for (const ticket of openTickets) {
    await ticket.update({ status: "closed" });
  }
};

export default CheckContactOpenTickets;