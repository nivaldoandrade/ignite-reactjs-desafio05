import { useCallback, useState } from 'react';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { getPrismicClient } from '../services/prismic';

import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}
export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [nextPage, setNextPage] = useState(postsPagination.next_page);
  const [posts, setPosts] = useState<Post[]>(
    postsPagination.results.map(post => ({
      ...post,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        {
          locale: ptBR,
        }
      ),
    }))
  );

  const handleNextPagePosts = useCallback(async () => {
    if (nextPage) {
      fetch(nextPage)
        .then(response => response.json())
        .then(data => {
          const newPosts = data.results.map(post => ({
            uid: post.uid,
            first_publication_date: format(
              new Date(post.first_publication_date),
              'dd MMM yyyy',
              {
                locale: ptBR,
              }
            ),
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle ? post.data.subtitle : '',
              author: post.data.author,
            },
          }));

          setNextPage(data.next_page);
          setPosts(state => [...state, ...newPosts]);
        });
    }
  }, [nextPage]);

  return (
    <main className={styles.container}>
      <header>
        <Link href="/">
          <a>
            <img src="/logo.svg" alt="logo" />
          </a>
        </Link>
      </header>
      <section>
        <div className={styles.postsList}>
          {posts.map(post => (
            <Link key={post.uid} href={`/post/${post.uid}`}>
              <a>
                <h1>{post.data.title}</h1>
                <p>{post.data.subtitle}</p>
                <span>
                  <FiCalendar size={20} />
                  {post.first_publication_date}
                </span>
                <span>
                  <FiUser size={20} />
                  {post.data.author}
                </span>
              </a>
            </Link>
          ))}
        </div>
        {nextPage && (
          <button type="button" onClick={handleNextPagePosts}>
            Carregar mais posts
          </button>
        )}
      </section>
    </main>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
    }
  );

  const posts = postsResponse.results.map(post => ({
    uid: post.uid,
    first_publication_date: post.first_publication_date,
    data: {
      title: post.data.title,
      subtitle: post.data.subtitle ? post.data.subtitle : '',
      author: post.data.author,
    },
  }));

  return {
    props: {
      postsPagination: {
        results: posts,
        next_page: postsResponse.next_page,
      },
    },
    revalidate: 60 * 60 * 1, // 1hours
  };
};
