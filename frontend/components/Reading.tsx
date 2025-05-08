import React, { useState, useEffect } from 'react';
import { useIpfs, goToReadKnowledgePack } from '@/context/IpfsContext';
import { useZkapp } from '@/context/ZkappContext';
import { useModal } from '@/context/ModalContext';
import { useWallet } from '@/context/WalletContext';
import { useBackend } from '@/context/BackendContext';
import ReactMarkdown from 'react-markdown';

export default function Reading() {

    const { goToReadKnowledgePack, ipfsCreateNewKnowledge, ipfsLocalDecryptKnowledgeData, ipfsGetKnowledgeChapterTitles, ipfsGetKnowledgeChapterData, ipfsGetTempImgPackCarBytes } = useIpfs();
    const { zkappDecryptKey } = useZkapp();
    const { showModal, hideModal, showLoading, showError, showSuccess } = useModal();
    const { walletStatus } = useWallet();
    const { backendSetTempImgPack, backendGetTempImgTempLinks, backendDelTempImgPack } = useBackend();

    const [chapterMds, setChapterMds] = useState<string[]>([]);
    const [chapterTitles, setChapterTitles] = useState<string[]>([]);
    const [chapterTempImageCIDs, setChapterTempImageCIDs] = useState<string[]>([]);
    
    const [readKnowledgePack, setReadKnowledgePack] = useState<goToReadKnowledgePack>(goToReadKnowledgePack);
    const [isLoading, setIsLoading] = useState(true);
    

    useEffect(() => {
        const initialize = async () => {
            const { public_order, pvk, pbk, metadata } = readKnowledgePack;
            console.log({ public_order, pvk, pbk, metadata });
            if (Object.keys(metadata).length === 0) {
                showError('无待阅读知识!');
                return;
            }
            const decryption_keys = metadata.decryption_keys;
            if (!decryption_keys.free && !pvk){
                showError('未设置密钥!');
                return;
            }
            await ipfsCreateNewKnowledge('');
            let dKey: Uint8Array;
            let dNonce: Uint8Array;
            if (!decryption_keys.free) {
                const { serializedEncryptedKey, serializedEncryptedNonce } = decryption_keys.specialized[pbk];
                const { decryptedKey, decryptedNonce } = await zkappDecryptKey(serializedEncryptedKey, serializedEncryptedNonce, pvk);
                dKey = decryptedKey;
                dNonce = decryptedNonce;
            } else {
                const { key, nonce } = decryption_keys.free;
                dKey = key;
                dNonce = nonce;
            }
            const success = await ipfsLocalDecryptKnowledgeData(public_order, { key: dKey, nonce: dNonce });
            if (!success) {
                showError('解密失败!');
                return;
            }
            const chapterTitles = await ipfsGetKnowledgeChapterTitles();
            const chapterNum = chapterTitles.length;
            const chapterMds = [];
            const chapterTempImageCIDs = [];
            for (let i = 0; i < chapterNum; i++) {
                const chapterData = await ipfsGetKnowledgeChapterData(i);
                let ipfs_markdown_data = chapterData.ipfs_markdown_data;
                const tempImgPackCarBytes = await ipfsGetTempImgPackCarBytes(i, walletStatus.address);
                const {success, cid} = await backendSetTempImgPack(tempImgPackCarBytes);
                if (!success) {
                    showError('临时图片打包失败!');
                    return;
                }
                chapterTempImageCIDs.push(cid);
                const tempImgTempLinks = await backendGetTempImgTempLinks(chapterData.images);
                for (const image_link in tempImgTempLinks) {
                    ipfs_markdown_data = ipfs_markdown_data.replace(image_link, tempImgTempLinks[image_link]);
                }
                chapterMds.push(ipfs_markdown_data);
            }
            setChapterTitles(chapterTitles);
            setChapterMds(chapterMds);
            setChapterTempImageCIDs(chapterTempImageCIDs);
            console.log('临时图片', chapterTempImageCIDs);

            setIsLoading(false);
        }
        initialize();
        return () => {
            // console.log('临时图片', chapterTempImageCIDs);
            // if (chapterTempImageCIDs.length > 0) {
            //     for (const cid of chapterTempImageCIDs) {
            //         backendDelTempImgPack(cid);
            //     }
            // }
        }
    }, []);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <ReactMarkdown  
        components={{
          img: ({ src, alt, ...props }) => (
            <img src={src} alt={alt} {...props} />
          ),
        }}>{chapterMds[0] || ''}</ReactMarkdown>
    );
}
