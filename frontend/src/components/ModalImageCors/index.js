import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";

import ModalImage from "react-modal-image";
import api from "../../services/api";

const useStyles = makeStyles(theme => ({
	messageMedia: {
		objectFit: "cover",
		width: 250,
		height: 200,
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
		borderBottomLeftRadius: 8,
		borderBottomRightRadius: 8,
	},
}));

const ModalImageCors = ({ imageUrl }) => {
	const classes = useStyles();
	const [fetching, setFetching] = useState(true);
	const [blobUrl, setBlobUrl] = useState("");

	// Em frontend/src/components/ModalImageCors/index.js
useEffect(() => {
  if (!imageUrl) return;
  
	const fetchImage = async () => {
		try {
		// Verificar se é uma URL válida ou um caminho relativo
		let validUrl = imageUrl;
		
		// Se não começar com http ou https, e não for uma URL data:, é provavelmente um caminho relativo
		if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
			// Adicionar a base URL da API (ajuste conforme necessário)
			validUrl = process.env.REACT_APP_BACKEND_URL + imageUrl;
		}
		
		console.log('Fetching image from URL:', validUrl);
		
		const { data, headers } = await api.get(validUrl, {
			responseType: "blob",
		});
		
		const url = window.URL.createObjectURL(
			new Blob([data], { type: headers["content-type"] })
		);
		
		setBlobUrl(url);
		setFetching(false);
		} catch (error) {
		console.error("Erro ao carregar imagem:", error);
		setFetching(false);
		}
	};
	
	fetchImage();
	}, [imageUrl]);

	return (
		<ModalImage
			className={classes.messageMedia}
			smallSrcSet={fetching ? imageUrl : blobUrl}
			medium={fetching ? imageUrl : blobUrl}
			large={fetching ? imageUrl : blobUrl}
			alt="image"
		/>
	);
};

export default ModalImageCors;
